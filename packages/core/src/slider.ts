// Goo slider: each thumb is a goo blob and the range fill is liquid.
//
// One goo layer on the slider root (fill segments + two circles per thumb), so the thumbs
// melt into the fill. The real reka parts stay in place (transparent) and keep every bit of
// behaviour: dragging, keyboard, aria, orientation, inverted / rtl, multiple thumbs. Core
// only MEASURES them (thumb centers, range rect, track thickness) and draws goo that chases
// those targets:
//   - jelly: each goo thumb follows its real thumb on an underdamped spring, so it lags while
//     you drag and overshoots / wobbles to rest when you stop. Release adds a jelly wobble.
//   - stretch: the thumb stretches along the slider with its speed and drags a teardrop tail.
//   - splat: a jump (click on the track, Home/End, a v-model change) throws the thumb across
//     with a stretch; it lands with a small splat (the shared goo-toggle splat,
//     splat.ts's `splatCurve`).
//   - slosh: the fill's surface piles up toward a thumb that accelerates, sloshes back when it
//     stops, and a wave runs along it (shared liquid slosh spring + `liquidBar`).
//
// Pure pieces (`sliderThumbCircles`, `sliderPose`, `sliderThumbDeform`) take plain numbers so
// tests and reduced motion share them. Nothing touches `document`/`window` until
// `attachSlider` is called (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { createSlosh, liquidBar, sloshConfig, sloshSettled, sloshWave, stepSlosh, noCircle, type LiquidCircle, type SloshState } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { trackPointer, type PointerTracker } from './pointer'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { isSpringSettled, springConfig, stepSpring, type SpringConfig, type SpringState } from './spring'
import { GOO_SPLAT, gooEffectValue, splatCurve } from './splat'
import { readPreset } from './tuning'

/** Ellipses in the liquid fill. */
export const SLIDER_FILL_SEGMENTS = 16
/** Circles per goo thumb: head + tail. */
export const SLIDER_THUMB_CIRCLES = 2
/** CSS var the goo paints with (fill and thumbs). Default `var(--primary)`. */
export const SLIDER_COLOR_VAR = '--goop-slider-color'

/** The slider's individually toggleable effects (boolean or 0..2 multiplier). */
export const SLIDER_EFFECTS = ['jelly', 'slosh', 'stretch', 'splat'] as const
export type SliderEffect = (typeof SLIDER_EFFECTS)[number]
export type SliderEffects = Record<SliderEffect, number>
export const SLIDER_ALL_EFFECTS: Readonly<SliderEffects> = Object.freeze({ jelly: 1, slosh: 1, stretch: 1, splat: 1 })

/** Per-preset feel. Lengths in thumb radii unless noted. */
export interface SliderFeel {
  /** Thumb follow spring with full jelly: response (s) and damping ratio. */
  response: number
  dampingRatio: number
  /** Stretch along the slider at full speed (0 = round). */
  stretch: number
  /** Thumb speed (radii/s) that counts as full speed. */
  speedRef: number
  /** Surface slosh strength. */
  slosh: number
  /** Landing splat strength. */
  splat: number
  /** Release wobble strength. */
  release: number
  /** Seconds a splat / release wobble lasts. */
  settle: number
  /** Goo blur as a fraction of the thumb diameter. */
  softness: number
}

export const SLIDER_FEEL: Readonly<Record<GoopPreset, Readonly<SliderFeel>>> = Object.freeze({
  subtle: Object.freeze({ response: 0.1, dampingRatio: 0.72, stretch: 0.6, speedRef: 90, slosh: 0.6, splat: 0.6, release: 0.5, settle: 0.45, softness: 0.09 }),
  playful: Object.freeze({ response: 0.13, dampingRatio: 0.52, stretch: 1, speedRef: 80, slosh: 1, splat: 1, release: 1, settle: 0.55, softness: 0.09 }),
  wild: Object.freeze({ response: 0.17, dampingRatio: 0.38, stretch: 1.45, speedRef: 70, slosh: 1.5, splat: 1.4, release: 1.4, settle: 0.7, softness: 0.1 }),
})

/** Feel-independent constants. */
export const SLIDER_TUNING = Object.freeze({
  /** Without jelly the thumb still eases (critically damped, this response). */
  plainResponse: 0.06,
  /** A target move bigger than this (thumb radii) while not dragging is a jump (lands with a splat). */
  jumpMin: 1.5,
  /** Container acceleration (radii/s²) that piles the surface up fully. */
  sloshRef: 9000,
  /** Pile-up height (track half-thicknesses) at full slosh. */
  pileAmp: 1.4,
  /** Wavelength of the surface wave (track half-thicknesses). */
  waveLength: 10,
  /** Max along-travel stretch / cross thinning per unit of stretch. */
  stretchAlong: 0.32,
  stretchCross: 0.13,
})

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))
const none = noCircle

/** One goo thumb: position on the main axis and the cross axis (px), speed along the main
 *  axis (px/s, signed), and its jelly deformation `q` (> 0 flattened along the travel). */
export interface SliderThumbState {
  pos: number
  cross: number
  vel: number
  q: number
}

export interface SliderGeometry {
  vertical: boolean
  /** Thumb radius and track half-thickness (px). */
  thumbR: number
  trackR: number
}

/** Along / across scale of a thumb at speed `vel` with deformation `q`. Pure. */
export function sliderThumbDeform(
  vel: number,
  q: number,
  r: number,
  feel: SliderFeel = SLIDER_FEEL.playful,
  effects: SliderEffects = SLIDER_ALL_EFFECTS,
): { k: number; along: number; across: number } {
  const k = Math.max(0, effects.stretch) * feel.stretch * clamp(Math.abs(vel) / Math.max(1, feel.speedRef * r), 0, 1.3)
  const along = Math.max(0.5, 1 + SLIDER_TUNING.stretchAlong * k - GOO_SPLAT.flatten * q)
  const across = Math.max(0.55, 1 - SLIDER_TUNING.stretchCross * k + GOO_SPLAT.bulge * q)
  return { k, along, across }
}

/** A goo thumb as [head, tail]. The tail trails the travel in proportion to the stretch. */
export function sliderThumbCircles(
  t: SliderThumbState,
  g: SliderGeometry,
  feel: SliderFeel = SLIDER_FEEL.playful,
  effects: SliderEffects = SLIDER_ALL_EFFECTS,
): LiquidCircle[] {
  const r = g.thumbR
  const { k, along, across } = sliderThumbDeform(t.vel, t.q, r, feel, effects)
  const at = (main: number, rr: number, sMain: number, sCross: number): LiquidCircle =>
    g.vertical ? { x: t.cross, y: main, r: rr, sx: sCross, sy: sMain } : { x: main, y: t.cross, r: rr, sx: sMain, sy: sCross }
  const dir = t.vel >= 0 ? 1 : -1
  const head = at(t.pos, r * (1 - 0.06 * k), along, across)
  const tail = k < 0.03 ? none(head.x, head.y) : at(t.pos - dir * r * 0.55 * k, r * 0.6, 1, 1)
  return [head, tail]
}

export interface SliderPoseInput {
  thumbs: SliderThumbState[]
  /** The liquid fill between two main-axis positions (px), or null when empty. */
  fill: { a: number; b: number; cross: number } | null
  slosh?: SloshState
}

export interface SliderPose {
  /** SLIDER_FILL_SEGMENTS ellipses. */
  fill: LiquidCircle[]
  /** SLIDER_THUMB_CIRCLES circles per thumb, in thumb order. */
  thumbs: LiquidCircle[]
}

/** The slider's goo circles. Pure. */
export function sliderPose(
  input: SliderPoseInput,
  g: SliderGeometry,
  feel: SliderFeel = SLIDER_FEEL.playful,
  effects: SliderEffects = SLIDER_ALL_EFFECTS,
): SliderPose {
  const slosh = effects.slosh > 0 ? input.slosh : undefined
  const r = g.trackR + 0.35
  const fill = input.fill
    ? liquidBar({
        a: input.fill.a,
        b: input.fill.b,
        cross: input.fill.cross,
        r,
        vertical: g.vertical,
        surface: g.vertical ? 0 : -1,
        pile: slosh?.x ?? 0,
        pileAmp: SLIDER_TUNING.pileAmp,
        wave: slosh ? sloshWave(slosh) * Math.min(1.5, effects.slosh) : 0,
        phase: slosh?.phase ?? 0,
        waveLength: r * SLIDER_TUNING.waveLength,
        segments: SLIDER_FILL_SEGMENTS,
      })
    : liquidBar({ a: 0, b: 0, cross: 0, r: 0, segments: SLIDER_FILL_SEGMENTS })
  const thumbs = input.thumbs.flatMap((t) => sliderThumbCircles(t, g, feel, effects))
  return { fill, thumbs }
}

/** Goo filter for a thumb `radius` px. */
export function sliderGooParams(radius: number, feel: SliderFeel = SLIDER_FEEL.playful): GooFilterParams {
  const blur = Math.max(0.5, Math.round(radius * 2 * feel.softness * 4) / 4)
  return { blur, contrast: 20, threshold: 0.4 }
}

/** The thumb's follow spring for a jelly amount (0 = plain, critically damped and quick). */
export function sliderSpring(jelly: number, feel: SliderFeel = SLIDER_FEEL.playful): SpringConfig {
  const j = clamp(jelly, 0, 2)
  if (j <= 0) return springConfig({ response: SLIDER_TUNING.plainResponse, dampingRatio: 1 })
  const ratio = 1 - Math.min(1, j) * (1 - feel.dampingRatio) - Math.max(0, j - 1) * 0.15
  const response = SLIDER_TUNING.plainResponse + (feel.response - SLIDER_TUNING.plainResponse) * Math.min(1.4, j)
  return springConfig({ response, dampingRatio: Math.max(0.2, ratio) })
}

export interface SliderOptions {
  /** 'horizontal' (default) or 'vertical'. */
  orientation?: 'horizontal' | 'vertical'
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** Thumb lags on a jelly spring, overshoots and wobbles to rest. Default true. */
  jelly?: boolean | number
  /** The fill's surface piles up, sloshes back and waves. Default true. */
  slosh?: boolean | number
  /** The thumb stretches along the slider with speed. Default true. */
  stretch?: boolean | number
  /** A jumping thumb lands with a small splat. Default true. */
  splat?: boolean | number
  /** Selectors for the parts to measure (shadcn `data-slot`s by default). */
  thumbSelector?: string
  rangeSelector?: string
  trackSelector?: string
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface SliderHandle {
  update(opts?: SliderOptions): void
  /** Re-measure the thumbs / range (core also watches their style attributes). */
  measure(): void
  readonly running: boolean
  readonly reducedMotion: boolean
  /** The pose last drawn. */
  readonly pose: SliderPose | null
  destroy(): void
}

const effectsOf = (o: SliderOptions): SliderEffects => ({
  jelly: gooEffectValue(o.jelly),
  slosh: gooEffectValue(o.slosh),
  stretch: gooEffectValue(o.stretch),
  splat: gooEffectValue(o.splat),
})

interface Thumb {
  s: SpringState
  target: number
  cross: number
  /** A jump is under way: splat when it lands. */
  jump: boolean
  /** Seconds since the last deformation kick (< 0 = none), its amplitude and wobble. */
  age: number
  amp: number
  after: number
}

/** Attach goo thumbs and a liquid fill to a slider root `host` (it becomes the stacking
 *  context for one aria-hidden goo layer drawn above the track). */
export function attachSlider(host: HTMLElement, options: SliderOptions = {}): SliderHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: SliderOptions = { ...options }
  let feel = SLIDER_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  let geom: SliderGeometry = { vertical: opts.orientation === 'vertical', thumbR: 6, trackR: 2 }
  let params = sliderGooParams(geom.thumbR, feel)
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let thumbs: Thumb[] = []
  let range: { a: number; b: number } | null = null
  let trackCross = 0
  const slosh = createSlosh()
  let last: SliderPose | null = null
  let destroyed = false
  let dragging = false
  let justPressed = false
  let active = -1
  let pointer: PointerTracker | null = null

  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const sel = {
    thumb: () => opts.thumbSelector ?? '[data-slot="slider-thumb"]',
    range: () => opts.rangeSelector ?? '[data-slot="slider-range"]',
    track: () => opts.trackSelector ?? '[data-slot="slider-track"]',
  }

  /** Fill ends follow the goo thumbs that sit on them, else the range rect. */
  const fillOf = (): SliderPoseInput['fill'] => {
    if (!range) return null
    const end = (x: number): number => {
      let best: Thumb | null = null
      for (const t of thumbs) if (Math.abs(t.target - x) < 1.5 && (!best || Math.abs(t.target - x) < Math.abs(best.target - x))) best = t
      return best ? best.s.x : x
    }
    return { a: end(range.a), b: end(range.b), cross: trackCross }
  }

  const deformOf = (t: Thumb): number => (t.age >= 0 ? t.amp * splatCurve(t.age, feel.settle, t.after) : 0)

  const draw = (): void => {
    if (!layer) return
    const drag = dragging && pointer ? pointer.sample() : null
    const states: SliderThumbState[] = thumbs.map((t, i) => {
      let vel = reduced ? 0 : t.s.v
      // While dragging, the pointer's own speed feeds the stretch of the thumb being dragged.
      if (drag && i === active) {
        const pv = geom.vertical ? drag.vy : drag.vx
        if (Math.abs(pv) * 0.6 > Math.abs(vel)) vel = pv * 0.6
      }
      return { pos: reduced ? t.target : t.s.x, cross: t.cross, vel, q: reduced ? 0 : deformOf(t) }
    })
    last = sliderPose({ thumbs: states, fill: fillOf(), slosh: reduced ? undefined : slosh }, geom, feel, effects)
    const circles = [...last.fill, ...last.thumbs]
    for (let i = 0; i < blobs.length; i++) {
      const c = circles[i]
      if (c) blobs[i]!.set(c.x, c.y, c.r, 1, c.sx, c.sy)
      else blobs[i]!.set(0, 0, 0)
    }
    layer.flush()
  }

  const padding = () => {
    const p = Math.ceil(params.blur * 3 + geom.thumbR * 1.6)
    return { side: p, bottom: p }
  }

  const ensureBlobs = (): void => {
    if (!layer) return
    const want = SLIDER_FILL_SEGMENTS + thumbs.length * SLIDER_THUMB_CIRCLES
    while (blobs.length < want) blobs.push(layer.createBlob())
    while (blobs.length > want) blobs.pop()!.remove()
  }

  const measure = (): void => {
    if (destroyed) return
    const hr = host.getBoundingClientRect()
    const vertical = opts.orientation === 'vertical'
    const mainOf = (r: DOMRect): [number, number] => (vertical ? [r.top - hr.top, r.bottom - hr.top] : [r.left - hr.left, r.right - hr.left])
    const crossOf = (r: DOMRect): number => (vertical ? (r.left + r.right) / 2 - hr.left : (r.top + r.bottom) / 2 - hr.top)
    const trackEl = host.querySelector(sel.track())
    const tr = trackEl?.getBoundingClientRect()
    const els = Array.from(host.querySelectorAll(sel.thumb()))
    const first = els[0]?.getBoundingClientRect()
    const trackR = tr ? Math.max(0.5, (vertical ? tr.width : tr.height) / 2) : 2
    const thumbR = first && first.width > 0 ? Math.min(first.width, first.height) / 2 : Math.max(trackR * 3, 4)
    const nextGeom: SliderGeometry = { vertical, thumbR, trackR }
    trackCross = tr ? crossOf(tr) : vertical ? hr.width / 2 : hr.height / 2
    const blurChanged = sliderGooParams(thumbR, feel).blur !== params.blur
    geom = nextGeom
    const rangeEl = host.querySelector(sel.range())
    const rr = rangeEl?.getBoundingClientRect()
    if (rr) {
      const [a, b] = mainOf(rr)
      range = b - a > 0.01 ? { a, b } : { a, b: a }
    } else range = null
    const prev = thumbs
    thumbs = els.map((el, i) => {
      const r = el.getBoundingClientRect()
      const [a, b] = mainOf(r)
      const target = (a + b) / 2
      const cross = r.width > 0 || r.height > 0 ? crossOf(r) : trackCross
      const old = prev[i]
      if (!old) return { s: { x: target, v: 0 }, target, cross, jump: false, age: -1, amp: 0, after: 1 }
      const moved = Math.abs(target - old.target)
      if (moved > 0.01) {
        active = i
        if (moved > SLIDER_TUNING.jumpMin * thumbR && (!dragging || justPressed)) old.jump = true
      }
      old.target = target
      old.cross = cross
      if (reduced) old.s = { x: target, v: 0 }
      return old
    })
    justPressed = false
    if (layer) {
      if (blurChanged) {
        params = sliderGooParams(thumbR, feel)
        layer.setParams(params)
      }
      layer.setPadding(padding())
      ensureBlobs()
    }
    draw()
    sync()
  }

  const teardown = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
  }

  const build = (): void => {
    teardown()
    params = sliderGooParams(geom.thumbR, feel)
    layer = resolveRenderer(opts.renderer)(host, params)
    layer.layer.style.setProperty('--goop-color', `var(${SLIDER_COLOR_VAR}, var(--primary, currentColor))`)
    // Above the track (a positioned child with its own background), below nothing that
    // matters: the real thumbs are transparent and the layer ignores the pointer.
    layer.layer.style.zIndex = '0'
    layer.layer.setAttribute('data-goop-slider', '')
    layer.setBodyScale(0, 0)
    layer.setPadding(padding())
    ensureBlobs()
    measure()
  }

  const kick = (t: Thumb, amp: number, after: number): void => {
    t.age = 0
    t.amp = amp
    t.after = after
  }

  const settled = (): boolean =>
    !dragging &&
    thumbs.every((t) => !t.jump && isSpringSettled(t.s, t.target, 0.05, 1) && !(t.age >= 0 && t.age < feel.settle)) &&
    (effects.slosh <= 0 || sloshSettled(slosh))
  const shouldRun = (): boolean => !destroyed && !reduced && !settled()

  const tick: Ticker = (rawDt) => {
    if (!shouldRun()) return false
    const dt = rawDt * Math.max(0.05, opts.speed ?? 1)
    const cfg = sliderSpring(effects.jelly, feel)
    let accel = 0
    const fillEnds = range ? [range.a, range.b] : []
    for (const t of thumbs) {
      const a = cfg.stiffness * (t.target - t.s.x) - cfg.damping * t.s.v
      if (fillEnds.some((e) => Math.abs(t.target - e) < 1.5)) accel += a
      const before = t.s.x - t.target
      stepSpring(t.s, t.target, cfg, dt)
      const after = t.s.x - t.target
      if (t.jump && (Math.sign(before) !== Math.sign(after) || Math.abs(after) < 0.4)) {
        t.jump = false
        const impact = clamp(Math.abs(t.s.v) / Math.max(1, feel.speedRef * geom.thumbR * 1.5), 0.35, 1)
        const splat = Math.max(0, effects.splat) * feel.splat
        if (splat > 0) kick(t, 0.75 * splat * impact, clamp(0.3 + 0.7 * effects.jelly, 0, 1.6))
      }
      if (t.age >= 0) {
        t.age += dt
        if (t.age >= feel.settle) t.age = -1
      }
      if (isSpringSettled(t.s, t.target, 0.05, 1) && !t.jump) t.s = { x: t.target, v: 0 }
    }
    if (effects.slosh > 0) {
      const gain = (feel.slosh * Math.min(2, effects.slosh)) / (SLIDER_TUNING.sloshRef * Math.max(1, geom.thumbR))
      stepSlosh(slosh, accel, dt, sloshConfig(), gain)
      if (sloshSettled(slosh) && !dragging) Object.assign(slosh, { x: 0, v: 0 })
    }
    draw()
    return shouldRun()
  }
  const sync = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragging = true
    justPressed = true
    pointer?.feed(e)
    sync()
  }
  const onUp = (): void => {
    if (!dragging) return
    dragging = false
    justPressed = false
    // Let go: the dragged thumb wobbles to rest, harder the faster it was moving.
    const t = thumbs[active]
    const jelly = Math.max(0, effects.jelly)
    if (t && jelly > 0 && !reduced) {
      const speed = clamp(Math.abs(t.s.v) / Math.max(1, feel.speedRef * geom.thumbR), 0.3, 1)
      kick(t, 0.32 * feel.release * Math.min(1.5, jelly) * speed, Math.min(1.5, jelly))
    }
    sync()
  }
  const onKey = (): void => {
    justPressed = true
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  build()

  host.addEventListener('pointerdown', onDown, { capture: true })
  host.addEventListener('keydown', onKey, { capture: true })
  doc.addEventListener('pointerup', onUp, true)
  doc.addEventListener('pointercancel', onUp, true)
  pointer = trackPointer(doc)
  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => measure()) : undefined
  ro?.observe(host)
  // reka moves thumbs / range by rewriting their inline style: re-measure on that.
  const MO = win?.MutationObserver
  const mo = MO
    ? new MO((records) => {
        // Our own goo layer rewrites styles every frame: only the real parts count.
        const own = layer?.layer
        if (records.some((r) => !own || !own.contains(r.target))) measure()
      })
    : undefined
  mo?.observe(host, { subtree: true, attributes: true, attributeFilter: ['style', 'data-orientation'], childList: true })
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    measure()
  })

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      feel = SLIDER_FEEL[readPreset(host, opts.preset)]
      effects = effectsOf(opts)
      reduced = readReduced()
      if (rendererChanged) build()
      else measure()
    },
    measure,
    get running() {
      return shouldRun()
    },
    get reducedMotion() {
      return reduced
    },
    get pose() {
      return last
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      ro?.disconnect()
      mo?.disconnect()
      unwatch()
      pointer?.release()
      host.removeEventListener('pointerdown', onDown, { capture: true })
      host.removeEventListener('keydown', onKey, { capture: true })
      doc.removeEventListener('pointerup', onUp, true)
      doc.removeEventListener('pointercancel', onUp, true)
      teardown()
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

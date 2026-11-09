// Field error goo (GoopFieldError): when an error message appears under a field it drips in.
// A small drop of the destructive colour hangs off the error's top edge (just under the
// control, where an invalid GoopInput's own drip hangs), falls on a thin neck into the first
// line and spreads flat into it, while the message unrolls top-down right behind the drop.
// Nothing loops and nothing is left behind: the goo layer exists only while it plays.
//
// Gentle on purpose: one small drop, a short neck, about half a second. The message's box
// never changes (no layout shift): the unroll is a clip-path on it, padded outward so the drop
// above the box isn't cut, and removed when done. The drop is ink overflow (no scroll growth).
// Reduced motion: no drip, the message just shows.
// The pose is pure (`fieldErrorPose`); no DOM access until `attachFieldError` (SSR-safe).

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import type { GooCircle } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { readPreset } from './tuning'

/** Individually toggleable field error effects (boolean or multiplier). `drip`: the drop that
 *  falls into the message. `reveal`: the message unrolls top-down behind it. */
export const FIELD_ERROR_EFFECTS = ['drip', 'reveal'] as const
export type FieldErrorEffect = (typeof FIELD_ERROR_EFFECTS)[number]

/** CSS vars the drop paints with (default: shadcn's `--destructive`). */
export const FIELD_ERROR_COLOR_VAR = '--goop-field-error-color'
export const FIELD_ERROR_OPACITY_VAR = '--goop-field-error-opacity'
/** `data-goop-part` of the drop's layer. */
export const FIELD_ERROR_PART = 'field-error'
/** Set on the message while it drips in. */
export const FIELD_ERROR_DRIPPING_ATTR = 'data-goop-dripping'

export interface FieldErrorFeel {
  /** Seconds the whole drip-in takes. */
  duration: number
  /** Drop radius, px. */
  drop: number
  /** How far above the message's top edge the drop starts (px). */
  lift: number
  /** How wide the drop spreads when it lands (x stretch). */
  spread: number
  /** Goo blur, px. */
  softness: number
}

export const FIELD_ERROR_FEEL: Readonly<Record<GoopPreset, Readonly<FieldErrorFeel>>> = Object.freeze({
  subtle: Object.freeze({ duration: 0.42, drop: 2.4, lift: 4, spread: 1.8, softness: 1 }),
  playful: Object.freeze({ duration: 0.52, drop: 3, lift: 5, spread: 2.2, softness: 1.1 }),
  wild: Object.freeze({ duration: 0.66, drop: 3.8, lift: 6, spread: 2.8, softness: 1.2 }),
})

/** Neck circles between the top edge and the drop. */
export const FIELD_ERROR_NECKS = 3
/** Circles the pose draws: the drop, then the neck. */
export const FIELD_ERROR_CIRCLES = 1 + FIELD_ERROR_NECKS

export interface FieldErrorPose {
  /** The drop, then the neck circles (message coordinates). */
  circles: GooCircle[]
  /** The drop's opacity. */
  opacity: number
  /** How much of the message is unrolled, px from its top (Infinity = all of it). */
  reveal: number
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
const smooth = (x: number): number => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

/**
 * The drip-in at progress `u` (0..1) for a message `height` px tall whose first line is
 * `line` px tall, with the drop at `x`. `drip` / `reveal` scale the drop and turn the unroll
 * on (0 = off). Pure.
 */
export function fieldErrorPose(
  u: number,
  x: number,
  height: number,
  line: number,
  feel: FieldErrorFeel = FIELD_ERROR_FEEL.playful,
  drip = 1,
  reveal = 1,
): FieldErrorPose {
  const t = clamp01(u)
  const r0 = feel.drop * Math.max(0, Math.min(2, drip))
  const land = 0.5
  // Falling: it accelerates out of the edge (ease-in), lands in the middle of the first line.
  const fall = clamp01(t / land)
  const y0 = -feel.lift
  const y1 = Math.max(r0, line * 0.5)
  const y = y0 + (y1 - y0) * fall * fall
  // Landing: it spreads flat into the line and fades.
  const after = smooth((t - land) / (1 - land))
  const r = r0 > 0 && t < 1 ? r0 * (1 - 0.35 * after) : 0
  const circles: GooCircle[] = [{ x, y, r, sx: 1 + (feel.spread - 1) * after, sy: 1 - 0.55 * after }]
  // The neck: from the top edge to the drop, thinning and pinching off before it lands.
  const neckR = r0 * 0.55 * (1 - smooth((t - 0.15) / 0.3))
  for (let k = 1; k <= FIELD_ERROR_NECKS; k++) {
    const f = k / (FIELD_ERROR_NECKS + 1)
    circles.push({ x, y: y0 + (y - y0) * f, r: r > 0 && neckR > 0.15 ? neckR * (1 - 0.25 * f) : 0, sx: 1, sy: 1 })
  }
  // The unroll trails just below the drop, then opens the rest.
  const edge = reveal > 0 && t < 1 ? Math.max(0, y + r0) + (height - Math.max(0, y + r0)) * smooth((t - land * 0.8) / (1 - land * 0.8)) : Infinity
  return { circles, opacity: t >= 1 ? 0 : 1 - smooth((t - 0.7) / 0.3), reveal: edge }
}

export function fieldErrorGooParams(feel: FieldErrorFeel = FIELD_ERROR_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.4 }
}

export interface FieldErrorOptions {
  /** The drop that falls into the message. `false`: off; `true`: the preset's; a number scales it. */
  drip?: boolean | number
  /** The message unrolls top-down behind the drop. `false`: it just shows. */
  reveal?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** `true` keeps it static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface FieldErrorHandle {
  /** Drip in again (e.g. when the message changes). */
  replay(): void
  update(options: FieldErrorOptions): void
  /** Is the drip-in playing? */
  readonly running: boolean
  readonly pose: FieldErrorPose | null
  destroy(): void
}

/** Attach the drip-in to an error message element (shadcn's FieldError). It plays once, when
 *  attached (the message just appeared) and on `replay()`. */
export function attachFieldError(host: HTMLElement, initial: FieldErrorOptions = {}): FieldErrorHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let options: FieldErrorOptions = { ...initial }
  const readReduced = (): boolean => options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  let feel: FieldErrorFeel = FIELD_ERROR_FEEL[GOOP_DEFAULT_PRESET]
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let t = 0
  let playing = false
  let destroyed = false
  let geo = { x: 0, h: 0, line: 0 }
  let last: FieldErrorPose | null = null
  let saved: { position: string; isolation: string; clip: string } | null = null

  const drip = (): number => gooEffectValue(options.drip)
  const reveal = (): number => gooEffectValue(options.reveal)
  const speed = (): number => (options.speed && options.speed > 0 ? options.speed : 1)

  const finish = (): void => {
    removeTicker(tick)
    playing = false
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
    if (saved) {
      host.style.position = saved.position
      host.style.isolation = saved.isolation
      host.style.clipPath = saved.clip
      saved = null
    }
    host.removeAttribute(FIELD_ERROR_DRIPPING_ATTR)
  }

  const draw = (): void => {
    last = fieldErrorPose(t / feel.duration, geo.x, geo.h, geo.line, feel, drip(), reveal())
    if (layer) {
      for (let i = 0; i < blobs.length; i++) {
        const c = last.circles[i]
        if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r, last.opacity, c.sx, c.sy)
        else blobs[i]!.set(0, 0, 0)
      }
      layer.flush()
    }
    if (saved) {
      // Padded outward on the other sides, so the drop above the box is never cut.
      const pad = Math.ceil(feel.drop * 4 + feel.lift + feel.softness * 3)
      host.style.clipPath = Number.isFinite(last.reveal)
        ? `inset(-${pad}px -${pad}px ${Math.max(0, Math.round((geo.h - last.reveal) * 10) / 10)}px -${pad}px)`
        : saved.clip
    }
  }

  const tick: Ticker = (dt) => {
    if (!playing || destroyed) return false
    t += dt * speed()
    if (t >= feel.duration) {
      finish()
      return false
    }
    draw()
    return true
  }

  const play = (): void => {
    finish()
    if (destroyed || reduced || !(drip() > 0 || reveal() > 0)) return
    const h = host.offsetHeight
    if (!(h > 0) || !(host.offsetWidth > 0)) return
    feel = FIELD_ERROR_FEEL[readPreset(host, options.preset)] ?? FIELD_ERROR_FEEL[GOOP_DEFAULT_PRESET]
    const cs = win?.getComputedStyle(host)
    const lh = parseFloat(cs?.lineHeight ?? '')
    const fs = parseFloat(cs?.fontSize ?? '') || 14
    const pl = parseFloat(cs?.paddingLeft ?? '') || 0
    geo = { x: pl + Math.min(10, Math.max(feel.drop + 2, host.offsetWidth * 0.04)), h, line: Math.min(h, Number.isFinite(lh) ? lh : fs * 1.4) }
    saved = { position: host.style.position, isolation: host.style.isolation, clip: host.style.clipPath }
    if (cs?.position === 'static') host.style.position = 'relative'
    host.style.isolation = 'isolate'
    if (drip() > 0) {
      layer = resolveRenderer(options.renderer)(host, fieldErrorGooParams(feel))
      layer.layer.setAttribute('data-goop-part', FIELD_ERROR_PART)
      layer.layer.style.setProperty('--goop-color', `var(${FIELD_ERROR_COLOR_VAR}, var(--destructive, #e7000b))`)
      layer.layer.style.setProperty('opacity', `var(${FIELD_ERROR_OPACITY_VAR}, 0.85)`)
      layer.setBodyScale(0, 0)
      const pad = Math.ceil(feel.drop * 3 + feel.lift + feel.softness * 3)
      layer.setPadding({ side: pad, bottom: pad })
      for (let i = 0; i < FIELD_ERROR_CIRCLES; i++) blobs.push(layer.createBlob())
    }
    t = 0
    playing = true
    host.setAttribute(FIELD_ERROR_DRIPPING_ATTR, '')
    draw()
    wakeTicker(tick)
  }

  const stopWatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) finish()
  })
  play()

  return {
    replay: play,
    update(next) {
      options = { ...next }
      reduced = readReduced()
      if (reduced || !(drip() > 0 || reveal() > 0)) finish()
    },
    get running() {
      return playing
    },
    get pose() {
      return last
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      finish()
      stopWatch()
    },
  }
}

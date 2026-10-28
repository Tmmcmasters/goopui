// Goo progress: the bar fills like liquid.
//
// One goo layer on the progress root: the fill (a `liquidBar`), a rounded goo front at its
// leading edge, and a few drip slots. The real reka indicator stays (transparent) for
// semantics; core draws:
//   - the front: chases the value on a soft spring, stretches with its speed, and bulges out
//     and wobbles every time the value changes (emerge's far-edge slosh, `emergeSloshOffset`).
//   - slosh: the fill's top surface carries a gentle travelling wave, and piles up toward the
//     front when it accelerates, sloshing back when it stops (shared liquid slosh spring).
//   - drips: now and then (seeded, varied gaps and sizes) a drop swells on the front's
//     underside, necks off (shared `hangingDrip`, as the spinner's drips) and falls away.
//   - indeterminate (value null): a goo slug runs along the bar with GoopSpinner's surge
//     (same easing and feel), stretching when fast; it drips too.
//
// Pure pieces (`progressPose`, `progressDripStarts`, `progressSlug`) take plain numbers.
// Nothing touches `document`/`window` until `attachProgress` is called (SSR-safe).

import type { GoopPreset } from './constants'
import { EMERGE_MOMENTUM, emergeSloshOffset } from './emerge-momentum'
import type { GooFilterParams } from './filter'
import { createSlosh, hangingDrip, liquidBar, noCircle, smooth01, sloshConfig, sloshSettled, sloshWave, stepSlosh, type LiquidCircle, type SloshState } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { SPINNER_FEEL } from './spinner'
import { isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { switchEffectValue } from './switch'
import { readPreset } from './tuning'

/** Ellipses in the liquid fill. */
export const PROGRESS_FILL_SEGMENTS = 20
/** Drips alive at once, at most; each is a drop plus one neck circle. */
export const PROGRESS_MAX_DRIPS = 3
const DRIP_CIRCLES = 2
/** Every circle the layer draws: fill, front, drips. */
export const PROGRESS_CIRCLES = PROGRESS_FILL_SEGMENTS + 1 + PROGRESS_MAX_DRIPS * DRIP_CIRCLES
/** CSS var the goo paints with. Default `var(--primary)`. */
export const PROGRESS_COLOR_VAR = '--goop-progress-color'

/** Individually toggleable effects (boolean or 0..2 multiplier). */
export const PROGRESS_EFFECTS = ['slosh', 'drips', 'wobble'] as const
export type ProgressEffect = (typeof PROGRESS_EFFECTS)[number]
export type ProgressEffects = Record<ProgressEffect, number>
export const PROGRESS_ALL_EFFECTS: Readonly<ProgressEffects> = Object.freeze({ slosh: 1, drips: 1, wobble: 1 })

/** Per-preset feel. Lengths in bar half-thicknesses (r) unless noted. */
export interface ProgressFeel {
  /** Front follow spring: response (s), damping ratio. */
  response: number
  dampingRatio: number
  /** Front radius. */
  front: number
  /** Front stretch at full speed, and the speed (r/s) that counts as full. */
  stretch: number
  speedRef: number
  /** Bulge / wobble strength when the value changes. */
  bulge: number
  /** Resting surface wave (fraction of r) and acceleration slosh strength. */
  idleWave: number
  slosh: number
  /** Seconds between drips (seeded within the range), drip size range (r). */
  dripGap: readonly [number, number]
  dripSize: readonly [number, number]
  /** Indeterminate: seconds per pass (GoopSpinner's period scaled) and surge (0..1). */
  period: number
  surge: number
  /** Goo blur as a fraction of the bar thickness. */
  softness: number
}

const feelFor = (p: GoopPreset, f: Omit<ProgressFeel, 'period' | 'surge'>): Readonly<ProgressFeel> =>
  Object.freeze({ ...f, period: SPINNER_FEEL[p].period * 1.6, surge: SPINNER_FEEL[p].surge })

export const PROGRESS_FEEL: Readonly<Record<GoopPreset, Readonly<ProgressFeel>>> = Object.freeze({
  subtle: feelFor('subtle', { response: 0.45, dampingRatio: 0.8, front: 1.2, stretch: 0.6, speedRef: 60, bulge: 0.6, idleWave: 0.12, slosh: 0.6, dripGap: Object.freeze([2.6, 4.6] as const), dripSize: Object.freeze([0.75, 1.0] as const), softness: 0.19 }),
  playful: feelFor('playful', { response: 0.5, dampingRatio: 0.62, front: 1.35, stretch: 1, speedRef: 50, bulge: 1, idleWave: 0.2, slosh: 1, dripGap: Object.freeze([1.4, 3.2] as const), dripSize: Object.freeze([0.8, 1.15] as const), softness: 0.2 }),
  wild: feelFor('wild', { response: 0.55, dampingRatio: 0.45, front: 1.5, stretch: 1.45, speedRef: 40, bulge: 1.5, idleWave: 0.3, slosh: 1.5, dripGap: Object.freeze([0.8, 2.0] as const), dripSize: Object.freeze([0.85, 1.3] as const), softness: 0.21 }),
})

/** Drip timing and fall (feel-independent). */
export const PROGRESS_DRIP = Object.freeze({
  /** Seconds a drop swells and necks before letting go. */
  swell: 0.55,
  /** Seconds it falls (and shrinks away) after letting go. */
  fall: 0.5,
  /** Fall distance in r, capped in px. */
  distance: 9,
  maxPx: 40,
  /** No drips below this much fill (px). */
  minFill: 10,
})

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))
const smooth = smooth01
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const none = noCircle
/** Deterministic 0..1 hash. */
const rand = (seed: number, a: number, b: number): number => {
  const s = Math.sin(seed * 127.1 + a * 311.7 + b * 74.7) * 43758.5453
  return s - Math.floor(s)
}

export interface ProgressGeometry {
  width: number
  height: number
}

/** Bar half-thickness of the fill (px). */
export const progressRadius = (g: ProgressGeometry): number => Math.max(1, g.height / 2) + 0.35

/** Start time (s) of drip `k` for `seed`: seeded, varied gaps. */
export function progressDripStarts(seed: number, feel: ProgressFeel, count: number): number[] {
  const out: number[] = []
  let t = 0.6
  for (let k = 0; k < count; k++) {
    t += lerp(feel.dripGap[0], feel.dripGap[1], rand(seed, k, 1))
    out.push(t)
  }
  return out
}

/** One drip: its index, seconds since it started swelling, and (once it let go) where. */
export interface ProgressDrip {
  k: number
  age: number
  release?: { x: number; y: number }
}

/** Indeterminate slug at `clock` seconds: main-axis ends (may run off the bar) and speed. */
export function progressSlug(clock: number, g: ProgressGeometry, feel: ProgressFeel = PROGRESS_FEEL.playful): { a: number; b: number; vel: number; accel: number } {
  const W = g.width
  const len = W * 0.36
  const span = W + len
  const q = (((clock / feel.period) % 1) + 1) % 1
  const TAU = Math.PI * 2
  // GoopSpinner's surge: x(q) = q - a·sin(2πq)/2π (never stops, eases once per pass).
  const e = q - (feel.surge * Math.sin(TAU * q)) / TAU
  const de = 1 - feel.surge * Math.cos(TAU * q)
  const front = -0.15 * len + e * (span + 0.15 * len)
  const k = (span + 0.15 * len) / feel.period
  // Fast = longer (it stretches out), slow = it bunches up.
  const l = len * (0.75 + 0.35 * (de - (1 - feel.surge)) / Math.max(0.01, 2 * feel.surge))
  return { a: front - l, b: front, vel: k * de, accel: (k / feel.period) * feel.surge * TAU * Math.sin(TAU * q) }
}

export interface ProgressPoseInput {
  /** Fill from `a` to the front at `b` (main-axis px; either may lie outside the bar). */
  a: number
  b: number
  /** Front speed (px/s) and bulge (px, + outward) from the value-change wobble. */
  vel: number
  bulge: number
  slosh?: SloshState
  /** Extra resting wave amplitude (fraction of r). */
  idleWave?: number
  drips?: ProgressDrip[]
  /** Drop radii and fall for each drip index (seeded). */
  dripRadius?: (k: number) => number
}

export interface ProgressPose {
  /** PROGRESS_FILL_SEGMENTS ellipses. */
  fill: LiquidCircle[]
  /** The goo front (r = 0 when the bar is empty). */
  front: LiquidCircle
  /** PROGRESS_MAX_DRIPS * 2 circles: drop, neck. */
  drips: LiquidCircle[]
  /** Where each live drip would let go now (by drip index), for the engine to remember. */
  releases: Map<number, { x: number; y: number }>
}

/** Front position / shape for a fill ending at `b`. */
function frontOf(i: ProgressPoseInput, g: ProgressGeometry, feel: ProgressFeel): LiquidCircle {
  const r = progressRadius(g)
  const cy = g.height / 2
  const lo = Math.max(0, Math.min(i.a, i.b))
  const end = Math.min(g.width, i.b)
  const len = end - lo
  if (!(len > 0.5)) return none(Math.max(0, end), cy)
  const rf = r * feel.front
  const k = feel.stretch * clamp(Math.abs(i.vel) / Math.max(1, feel.speedRef * r), 0, 1.2)
  const b = clamp(i.bulge / rf, -0.4, 1)
  const along = 1 + 0.35 * k + 0.35 * b
  const across = Math.max(0.6, 1 - 0.12 * k + 0.22 * Math.max(0, b) - 0.12 * Math.min(0, b))
  // Grows in with the fill; leaves the bar's far end by shrinking off it.
  const grow = smooth(len / (rf * 2.4)) * (1 - smooth((i.b - g.width) / (rf * 2)))
  const rr = rf * grow
  // Leading edge a touch past the fill end, the bulk sitting on the bar.
  const x = Math.max(lo + rr * along * 0.6, end - rr * along * 0.8)
  return rr > 0.05 ? { x, y: cy - (across - 1) * rr * 0.3, r: rr, sx: along, sy: across } : none(x, cy)
}

/** The progress goo. Pure. */
export function progressPose(
  input: ProgressPoseInput,
  g: ProgressGeometry,
  feel: ProgressFeel = PROGRESS_FEEL.playful,
  effects: ProgressEffects = PROGRESS_ALL_EFFECTS,
): ProgressPose {
  const r = progressRadius(g)
  const cy = g.height / 2
  const s = effects.slosh > 0 ? input.slosh : undefined
  const a = clamp(Math.min(input.a, input.b), 0, g.width)
  const b = clamp(input.b, 0, g.width)
  const fill = liquidBar({
    a,
    b,
    cross: cy,
    r,
    surface: -1,
    pile: s?.x ?? 0,
    pileAmp: 1.4,
    wave: s ? Math.min(1.5, effects.slosh) * ((input.idleWave ?? 0) + sloshWave(s)) : 0,
    phase: s?.phase ?? 0,
    waveLength: r * 12,
    segments: PROGRESS_FILL_SEGMENTS,
  })
  const front = frontOf(input, g, feel)
  const drips: LiquidCircle[] = Array.from({ length: PROGRESS_MAX_DRIPS * DRIP_CIRCLES }, () => none(0, cy))
  const releases = new Map<number, { x: number; y: number }>()
  if (effects.drips > 0 && input.drips) {
    const D = PROGRESS_DRIP
    const dist = Math.min(D.maxPx, r * D.distance)
    for (const d of input.drips) {
      const slot = (d.k % PROGRESS_MAX_DRIPS) * DRIP_CIRCLES
      const rd = (input.dripRadius?.(d.k) ?? r) * Math.min(1.3, 0.7 + 0.3 * effects.drips)
      if (d.age < D.swell) {
        if (front.r <= 0.05) continue
        // Hang from the front's underside, a little behind its nose.
        const ax = front.x - front.r * front.sx * 0.25
        const ay = front.y + front.r * front.sy * 0.45
        const u = d.age / D.swell
        const hang = hangingDrip(u, ax, ay, front.r * 0.5, rd, 1)
        hang.forEach((c, j) => (drips[slot + j] = { ...c, sx: 1, sy: 1 }))
        releases.set(d.k, { x: hang[0]!.x, y: hang[0]!.y })
      } else {
        const tf = (d.age - D.swell) / D.fall
        const rel = d.release
        if (!rel || tf >= 1) continue
        // Falls (accelerating), stretching a little, then shrinks away.
        const y = rel.y + dist * tf * tf
        const rr = rd * (1 - smooth((tf - 0.45) / 0.55))
        const st = 1 + 0.25 * smooth(tf / 0.4)
        drips[slot] = rr > 0.05 ? { x: rel.x, y, r: rr, sx: 1 / st, sy: st } : none(rel.x, y)
      }
    }
  }
  return { fill, front, drips, releases }
}

/** Goo filter for a bar `height` px tall. */
export function progressGooParams(height: number, feel: ProgressFeel = PROGRESS_FEEL.playful): GooFilterParams {
  const blur = Math.max(0.5, Math.round(Math.max(4, height) * feel.softness * 4) / 4)
  return { blur, contrast: 20, threshold: 0.4 }
}

export interface ProgressOptions {
  /** Current value; null = indeterminate (a goo slug runs along the bar). */
  value?: number | null
  /** Maximum value. Default 100. */
  max?: number
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** The top surface waves, piles up toward the front and sloshes back. Default true. */
  slosh?: boolean | number
  /** Drops now and then form on the front's underside and fall. Default true. */
  drips?: boolean | number
  /** The front bulges and wobbles when the value changes. Default true. */
  wobble?: boolean | number
  /** Varies drip timing and sizes. Default 0. */
  seed?: number
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface ProgressHandle {
  update(opts?: ProgressOptions): void
  resize(): void
  readonly running: boolean
  readonly reducedMotion: boolean
  readonly pose: ProgressPose | null
  destroy(): void
}

const effectsOf = (o: ProgressOptions): ProgressEffects => ({
  slosh: switchEffectValue(o.slosh),
  drips: switchEffectValue(o.drips),
  wobble: switchEffectValue(o.wobble),
})

const fractionOf = (o: ProgressOptions): number | null => {
  if (o.value === null) return null
  const max = Number.isFinite(o.max) && (o.max as number) > 0 ? (o.max as number) : 100
  const v = Number.isFinite(o.value) ? (o.value as number) : 0
  return clamp(v / max, 0, 1)
}

/** Attach a liquid fill to a progress root `host` (made the stacking context for one
 *  aria-hidden goo layer above its own background; its overflow is opened for the drips). */
export function attachProgress(host: HTMLElement, options: ProgressOptions = {}): ProgressHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: ProgressOptions = { ...options }
  let preset = readPreset(host, opts.preset)
  let feel = PROGRESS_FEEL[preset]
  let effects = effectsOf(opts)
  let geom: ProgressGeometry = { width: 100, height: 4 }
  let params = progressGooParams(4, feel)
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let frac = fractionOf(opts)
  const front: SpringState = { x: 0, v: 0 }
  const slosh = createSlosh()
  let clock = 0
  let kickAge = -1
  let kickAmp = 0
  let drips: ProgressDrip[] = []
  let starts: number[] = []
  let nextDrip = 0
  let last: ProgressPose | null = null
  let destroyed = false
  let visible = true

  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const measure = (): ProgressGeometry => {
    const w = host.offsetWidth || host.clientWidth
    const h = host.offsetHeight || host.clientHeight
    return w > 0 && h > 0 ? { width: w, height: h } : { width: 100, height: 4 }
  }
  const targetX = (): number => (frac ?? 0) * geom.width
  const seed = (): number => opts.seed ?? 0
  const dripRadius = (k: number): number => progressRadius(geom) * lerp(feel.dripSize[0], feel.dripSize[1], rand(seed(), k, 2))
  const padding = () => {
    const r = progressRadius(geom)
    const p = Math.ceil(params.blur * 3 + r * feel.front * 1.6)
    const fall = effects.drips > 0 ? Math.min(PROGRESS_DRIP.maxPx, r * PROGRESS_DRIP.distance) + r * 4 : 0
    return { side: p, bottom: p + Math.ceil(fall) }
  }
  const startTime = (k: number): number => {
    while (starts.length <= k) starts = progressDripStarts(seed(), feel, Math.max(8, starts.length * 2))
    return starts[k]!
  }

  const input = (): ProgressPoseInput => {
    const base = { slosh, idleWave: feel.idleWave, drips, dripRadius }
    if (reduced) {
      if (frac === null) return { ...base, a: geom.width * 0.3, b: geom.width * 0.7, vel: 0, bulge: 0, slosh: undefined, drips: [] }
      return { ...base, a: 0, b: targetX(), vel: 0, bulge: 0, slosh: undefined, drips: [] }
    }
    const bulge =
      kickAge >= 0 && effects.wobble > 0
        ? emergeSloshOffset(kickAge + EMERGE_MOMENTUM.slosh.start, progressRadius(geom) * feel.front, kickAmp * feel.bulge * Math.min(2, effects.wobble), preset)
        : 0
    if (frac === null) {
      const s = progressSlug(clock, geom, feel)
      return { ...base, a: s.a, b: s.b, vel: s.vel, bulge }
    }
    return { ...base, a: 0, b: front.x, vel: front.v, bulge }
  }

  const draw = (): void => {
    if (!layer) return
    last = progressPose(input(), geom, feel, effects)
    for (const [k, p] of last.releases) {
      const d = drips.find((x) => x.k === k)
      if (d) d.release = p
    }
    const circles = [...last.fill, last.front, ...last.drips]
    for (let i = 0; i < blobs.length; i++) {
      const c = circles[i]!
      blobs[i]!.set(c.x, c.y, c.r, 1, c.sx, c.sy)
    }
    layer.flush()
  }

  const teardown = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
  }
  const build = (): void => {
    teardown()
    geom = measure()
    params = progressGooParams(geom.height, feel)
    layer = resolveRenderer(opts.renderer)(host, params)
    layer.layer.style.setProperty('--goop-color', `var(${PROGRESS_COLOR_VAR}, var(--primary, currentColor))`)
    layer.layer.setAttribute('data-goop-progress', '')
    layer.setBodyScale(0, 0)
    layer.setPadding(padding())
    blobs = Array.from({ length: PROGRESS_CIRCLES }, () => layer!.createBlob())
    draw()
  }

  const resize = (): void => {
    if (destroyed || !layer) return
    const next = measure()
    if (next.width === geom.width && next.height === geom.height) return
    const scale = geom.width > 0 ? next.width / geom.width : 1
    front.x *= scale
    geom = next
    const p = progressGooParams(geom.height, feel)
    if (p.blur !== params.blur) {
      params = p
      layer.setParams(p)
    }
    layer.setPadding(padding())
    draw()
  }

  const fillVisible = (): boolean => (frac === null ? true : front.x > PROGRESS_DRIP.minFill)
  const idleMotion = (): boolean => fillVisible() && (frac === null || effects.drips > 0 || effects.slosh > 0)
  const shouldRun = (): boolean =>
    !destroyed &&
    !reduced &&
    visible &&
    (idleMotion() || !isSpringSettled(front, targetX(), 0.05, 1) || kickAge >= 0 || drips.length > 0 || !sloshSettled(slosh))

  const tick: Ticker = (rawDt) => {
    if (!shouldRun()) return false
    const dt = rawDt * Math.max(0.05, opts.speed ?? 1)
    clock += dt
    let accel = 0
    if (frac === null) accel = progressSlug(clock, geom, feel).accel
    else {
      const cfg = springConfig({ response: feel.response, dampingRatio: feel.dampingRatio })
      accel = cfg.stiffness * (targetX() - front.x) - cfg.damping * front.v
      stepSpring(front, targetX(), cfg, dt)
      if (isSpringSettled(front, targetX(), 0.05, 1)) {
        front.x = targetX()
        front.v = 0
      }
    }
    if (kickAge >= 0) {
      kickAge += dt
      if (kickAge > EMERGE_MOMENTUM.slosh.duration) kickAge = -1
    }
    if (effects.slosh > 0) {
      const r = progressRadius(geom)
      stepSlosh(slosh, accel, dt, sloshConfig(), (feel.slosh * Math.min(2, effects.slosh)) / (6000 * r))
    } else Object.assign(slosh, { x: 0, v: 0 })
    // Drips: spawn on schedule while there is a front to hang from; age; drop the finished.
    if (effects.drips > 0 && fillVisible()) {
      while (clock >= startTime(nextDrip)) {
        if (drips.length < PROGRESS_MAX_DRIPS && clock - startTime(nextDrip) < 0.2) drips.push({ k: nextDrip, age: clock - startTime(nextDrip) })
        nextDrip++
      }
    } else while (clock >= startTime(nextDrip)) nextDrip++
    for (const d of drips) d.age += dt
    drips = drips.filter((d) => d.age < PROGRESS_DRIP.swell + PROGRESS_DRIP.fall && (d.age >= PROGRESS_DRIP.swell ? !!d.release : true))
    draw()
    return shouldRun()
  }
  const sync = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  const setValue = (): void => {
    const next = fractionOf(opts)
    if (next === frac) return
    const prev = frac
    frac = next
    if (reduced) {
      front.x = targetX()
      front.v = 0
      return
    }
    if (prev === null && next !== null) {
      // Leaving indeterminate: the front pours on from where the slug was.
      front.x = clamp(progressSlug(clock, geom, feel).b, 0, geom.width)
      front.v = 0
    }
    if (next !== null) {
      kickAge = 0
      kickAmp = clamp((Math.abs(next - (prev ?? 0)) * geom.width) / (progressRadius(geom) * 8), 0.35, 1.4)
    }
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  const prevOverflow = host.style.overflow
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'
  // Drips fall below the bar and the front bulges past it.
  host.style.overflow = 'visible'

  build()
  front.x = targetX()

  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => resize()) : undefined
  ro?.observe(host)
  const IO = win?.IntersectionObserver
  const io = IO
    ? new IO((entries) => {
        visible = entries.some((e) => e.isIntersecting)
        sync()
      })
    : undefined
  io?.observe(host)
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) {
      front.x = targetX()
      front.v = 0
      drips = []
      kickAge = -1
    }
    draw()
    sync()
  })
  draw()
  sync()

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      const seedChanged = 'seed' in next && next.seed !== opts.seed
      opts = { ...opts, ...next }
      preset = readPreset(host, opts.preset)
      const nextFeel = PROGRESS_FEEL[preset]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      if (nextFeel !== feel || seedChanged) starts = []
      feel = nextFeel
      effects = effectsOf(opts)
      reduced = readReduced()
      setValue()
      if (reduced) {
        front.x = targetX()
        front.v = 0
        drips = []
      }
      if (rebuild) build()
      else {
        layer?.setPadding(padding())
        draw()
      }
      sync()
    },
    resize,
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
      io?.disconnect()
      unwatch()
      teardown()
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
      host.style.overflow = prevOverflow
    },
  }
}

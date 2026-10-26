// Goo spinner: a small orbit of metaballs chasing each other around a circle.
//
// Composes existing pieces only: a GoopRenderer (SVG filter or canvas) with its body hidden,
// plain GoopBlobs, and a ticker on the shared rAF loop. The motion is a pure function of time
// (`spinnerPose`), so the reduced-motion pose, the SSR fallback and every frame agree.
//
// Motion: the leader's angle is θ(p) = 2πp - a·sin 2πp (p = cycles), so it surges and eases
// once per turn without ever stopping. Follower i runs the same curve `lag` cycles late and
// `gap` radians behind. When the leader surges the chain spreads apart (split); when it
// eases the followers catch up and the blobs merge. Each head drags a tail circle behind it
// in proportion to its speed, which the goo filter turns into a stretched teardrop. The last
// blob keeps a thin neck to its neighbor while they separate, until the neck snaps.
//
// Nothing here touches `document`/`window` until `attachSpinner` is called (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { watchReducedMotion, isReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'
import { removeTicker, wakeTicker, type Ticker } from './loop'

export const SPINNER_MIN_BLOBS = 3
export const SPINNER_MAX_BLOBS = 6
export const SPINNER_DEFAULT_BLOBS = 4

/** Per-preset feel. Lengths are fractions of the spinner size, times in seconds. */
export interface SpinnerFeel {
  /** Seconds per orbit at speed 1. */
  period: number
  /** 0..1: how hard the leader surges (0 = constant speed). */
  surge: number
  /** Cycles each follower runs behind the one ahead (spreads the chain when fast). */
  lag: number
  /** Resting angle (rad) between neighbors (keeps them overlapping when slow). */
  gap: number
  /** Tail stretch multiplier (0 = round heads). */
  stretch: number
  /** Goo blur as a fraction of the size. */
  softness: number
}

export const SPINNER_FEEL: Readonly<Record<GoopPreset, Readonly<SpinnerFeel>>> = Object.freeze({
  subtle: Object.freeze({ period: 1.4, surge: 0.7, lag: 0.06, gap: 0.54, stretch: 0.6, softness: 0.055 }),
  playful: Object.freeze({ period: 1.15, surge: 0.85, lag: 0.08, gap: 0.48, stretch: 1, softness: 0.06 }),
  wild: Object.freeze({ period: 0.95, surge: 0.92, lag: 0.1, gap: 0.42, stretch: 1.4, softness: 0.065 }),
})

/** One circle of the pose, in unit space: center (0,0), the spinner spans -0.5..0.5. */
export interface SpinnerCircle {
  x: number
  y: number
  r: number
}

/** Hysteresis for the neck (true while the last two blobs are still connected). */
export interface SpinnerNeckState {
  necked: boolean
}

/** Orbit radius and leader radius, as fractions of the size. */
const ORBIT = 0.3
const HEAD = 0.15
/** Neck circles between the last two blobs. */
const NECK_CIRCLES = 2

const clampBlobs = (n: number | undefined): number =>
  Math.min(SPINNER_MAX_BLOBS, Math.max(SPINNER_MIN_BLOBS, Math.round(Number.isFinite(n) ? (n as number) : SPINNER_DEFAULT_BLOBS)))

/** Circles drawn for `blobs` blobs: a head and a tail each, plus the neck. */
export const spinnerCircleCount = (blobs: number): number => clampBlobs(blobs) * 2 + NECK_CIRCLES

/**
 * The spinner's circles at phase `p` (in orbits). Pure. Pass the same `neck` object every
 * frame to get the neck's stretch-then-snap hysteresis; omit it for a one-off pose (necked).
 * Order: heads (leader first), tails, neck.
 */
export function spinnerPose(
  p: number,
  blobs: number = SPINNER_DEFAULT_BLOBS,
  feel: SpinnerFeel = SPINNER_FEEL.playful,
  neck: SpinnerNeckState = { necked: true },
): SpinnerCircle[] {
  const n = clampBlobs(blobs)
  const TAU = Math.PI * 2
  const a = feel.surge
  const angle = (q: number): number => TAU * q - a * Math.sin(TAU * q)
  /** dθ/dp normalised to 0..1 (0 = slowest, 1 = fastest). */
  const pace = (q: number): number => (1 - Math.cos(TAU * q)) / 2

  const heads: SpinnerCircle[] = []
  const tails: SpinnerCircle[] = []
  const angles: number[] = []
  for (let i = 0; i < n; i++) {
    const q = p - i * feel.lag
    const th = angle(q) - i * feel.gap
    const v = Math.max(0, Math.min(1, pace(q)))
    // Leader biggest, the chain tapers to ~62%.
    const r = HEAD * (1 - (0.38 * i) / (n - 1))
    // Fast heads thin a little and throw their mass into the tail.
    const head = r * (1 - 0.1 * v * feel.stretch)
    const back = th - (0.06 + 0.3 * v) * feel.stretch
    angles.push(th)
    heads.push({ x: ORBIT * Math.cos(th), y: ORBIT * Math.sin(th), r: head })
    tails.push({ x: ORBIT * Math.cos(back), y: ORBIT * Math.sin(back), r: r * (0.62 + 0.08 * v) })
  }

  // Neck between the last two blobs: thins as they part, then snaps (radius 0) once the gap
  // between their edges passes ~one small radius. Reconnects only when they touch again.
  const A = heads[n - 2]!
  const B = heads[n - 1]!
  const d = Math.hypot(A.x - B.x, A.y - B.y)
  const touch = (A.r + B.r) * 0.92
  const snap = touch + B.r * 1.15
  if (d <= touch) neck.necked = true
  else if (d >= snap) neck.necked = false
  const stretch = Math.max(0, Math.min(1, (d - touch) / (snap - touch)))
  const neckR = neck.necked ? B.r * (0.62 - 0.27 * stretch) : 0
  const ta = angles[n - 2]!
  const tb = angles[n - 1]!
  const necks: SpinnerCircle[] = []
  for (let k = 1; k <= NECK_CIRCLES; k++) {
    const f = k / (NECK_CIRCLES + 1)
    const th = ta + (tb - ta) * f
    // Hang slightly inside the orbit so the thread sags like a real neck.
    const rr = ORBIT - 0.012 * stretch
    necks.push({ x: rr * Math.cos(th), y: rr * Math.sin(th), r: neckR * (1 - 0.15 * Math.abs(f - 0.5)) })
  }
  return [...heads, ...tails, ...necks]
}

/** The still pose for reduced motion (and the SSR fallback): the chain eased and merged. */
export function spinnerStaticPose(blobs: number = SPINNER_DEFAULT_BLOBS, feel: SpinnerFeel = SPINNER_FEEL.playful): SpinnerCircle[] {
  // Phase 0.03: just past the slowest point, so the chain sits merged with a hint of tail.
  return spinnerPose(0.03, blobs, feel, { necked: true })
}

/** Goo filter parameters for a spinner of `size` px (blur scales with size). */
export function spinnerGooParams(size: number, feel: SpinnerFeel = SPINNER_FEEL.playful): GooFilterParams {
  // Quarter-px steps so spinners of similar size share one filter.
  const blur = Math.max(0.5, Math.round(size * feel.softness * 4) / 4)
  return { blur, contrast: 20, threshold: 0.4 }
}

export interface SpinnerOptions {
  /** Number of blobs, 3..6. Default 4. */
  blobs?: number
  /** Orbit speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion and
   *  `<html data-reduced-motion="true">`, live. */
  reducedMotion?: boolean | 'auto'
}

export interface SpinnerHandle {
  /** Patch options in place (renderer and blob count changes rebuild the layer). */
  update(opts?: SpinnerOptions): void
  /** Re-measure the host (call after its size changes, if ResizeObserver is unavailable). */
  resize(): void
  /** True while the animation is ticking on the shared loop. */
  readonly running: boolean
  readonly reducedMotion: boolean
  destroy(): void
}

/** Attach a goo spinner to `host` (should be a sized, positioned box: it is made the
 *  stacking context for the aria-hidden goo layer). */
export function attachSpinner(host: HTMLElement, options: SpinnerOptions = {}): SpinnerHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: SpinnerOptions = { ...options }
  let feel = SPINNER_FEEL[readPreset(host, opts.preset)]
  let size = 0
  let params: GooFilterParams = spinnerGooParams(16, feel)
  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let count = clampBlobs(opts.blobs)
  const neck: SpinnerNeckState = { necked: true }
  let phase = 0
  let destroyed = false
  let visible = true
  let hidden = doc.visibilityState === 'hidden'

  const readReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const measure = (): number => {
    const w = host.clientWidth || host.offsetWidth
    const h = host.clientHeight || host.offsetHeight
    const s = Math.min(w, h) || Math.max(w, h)
    return s > 0 ? s : 16
  }

  const pad = (): number => Math.ceil(params.blur * 3)

  const draw = (circles: SpinnerCircle[]): void => {
    if (!renderer) return
    const c = size / 2
    for (let i = 0; i < blobs.length; i++) {
      const k = circles[i]
      if (k) blobs[i]!.set(c + k.x * size, c + k.y * size, k.r * size)
    }
    renderer.flush()
  }

  const drawNow = (): void => draw(reduced ? spinnerStaticPose(count, feel) : spinnerPose(phase, count, feel, neck))

  const build = (): void => {
    for (const b of blobs) b.remove()
    renderer?.destroy()
    size = measure()
    params = spinnerGooParams(size, feel)
    renderer = resolveRenderer(opts.renderer)(host, params)
    // No body: the spinner is only blobs.
    renderer.setBodyScale(0, 0)
    renderer.setPadding({ side: pad(), bottom: pad() })
    blobs = Array.from({ length: spinnerCircleCount(count) }, () => renderer!.createBlob())
    drawNow()
  }

  const resize = (): void => {
    if (destroyed || !renderer) return
    const next = measure()
    if (next === size) return
    size = next
    const p = spinnerGooParams(size, feel)
    if (p.blur !== params.blur) {
      params = p
      renderer.setParams(params)
    }
    renderer.setPadding({ side: pad(), bottom: pad() })
    drawNow()
  }

  const shouldRun = (): boolean => !destroyed && !reduced && visible && !hidden
  const tick: Ticker = (dt) => {
    if (!shouldRun()) return false
    phase += (dt * Math.max(0, opts.speed ?? 1)) / feel.period
    if (phase > 1e6) phase -= Math.floor(phase)
    drawNow()
    return true
  }
  const sync = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  build()

  const IO = win?.IntersectionObserver
  const io = IO
    ? new IO((entries) => {
        for (const e of entries) visible = e.isIntersecting
        sync()
      })
    : undefined
  io?.observe(host)
  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => resize()) : undefined
  ro?.observe(host)
  const onVisibility = (): void => {
    hidden = doc.visibilityState === 'hidden'
    sync()
  }
  doc.addEventListener('visibilitychange', onVisibility)
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    drawNow()
    sync()
  })

  sync()

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = SPINNER_FEEL[readPreset(host, opts.preset)]
      const nextCount = clampBlobs(opts.blobs)
      const rebuild = rendererChanged || nextCount !== count || nextFeel.softness !== feel.softness
      feel = nextFeel
      count = nextCount
      reduced = readReduced()
      if (rebuild) build()
      else drawNow()
      sync()
    },
    resize,
    get running() {
      return shouldRun()
    },
    get reducedMotion() {
      return reduced
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      io?.disconnect()
      ro?.disconnect()
      doc.removeEventListener('visibilitychange', onVisibility)
      unwatch()
      for (const b of blobs) b.remove()
      blobs = []
      renderer?.destroy()
      renderer = null
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

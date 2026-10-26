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
import { gooVanishRadius, type GooFilterParams } from './filter'
import { watchReducedMotion, isReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'
import { removeTicker, wakeTicker, type Ticker } from './loop'

export const SPINNER_MIN_BLOBS = 3
export const SPINNER_MAX_BLOBS = 6
export const SPINNER_DEFAULT_BLOBS = 4
/** Drips alive at once, at most (each is a drip circle plus a two-circle neck). */
export const SPINNER_MAX_DRIPS = 3
/** Turns between drip sheds, on average. */
export const SPINNER_DRIP_SPACING = 0.5
/** Turns a drip spends swelling off its blob, then falling to the bottom of the box. */
export const SPINNER_DRIP_SWELL = 0.12
export const SPINNER_DRIP_FALL = 0.6
/** Below this size (px) drips are noise and skipped. */
export const SPINNER_DRIP_MIN_SIZE = 10

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

/** Drip options for `spinnerPose`: the goo vanish radius in unit space (px / size). */
export interface SpinnerDripOptions {
  vanish: number
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

const DRIP_NECK = 2
const DRIP_CIRCLES = 1 + DRIP_NECK

const clampBlobs = (n: number | undefined): number =>
  Math.min(SPINNER_MAX_BLOBS, Math.max(SPINNER_MIN_BLOBS, Math.round(Number.isFinite(n) ? (n as number) : SPINNER_DEFAULT_BLOBS)))

/** Circles drawn for `blobs` blobs: a head and a tail each, plus the neck (and drip slots). */
export const spinnerCircleCount = (blobs: number, drips = false): number =>
  clampBlobs(blobs) * 2 + NECK_CIRCLES + (drips ? SPINNER_MAX_DRIPS * DRIP_CIRCLES : 0)

const smooth = (x: number): number => {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

/** Head of blob `i` (of `n`) at phase `p`: the same math as the pose loop. */
function headAt(p: number, i: number, n: number, feel: SpinnerFeel): SpinnerCircle {
  const TAU = Math.PI * 2
  const q = p - i * feel.lag
  const th = TAU * q - feel.surge * Math.sin(TAU * q) - i * feel.gap
  const v = (1 - Math.cos(TAU * q)) / 2
  const r = HEAD * (1 - (0.38 * i) / (n - 1))
  return { x: ORBIT * Math.cos(th), y: ORBIT * Math.sin(th), r: r * (1 - 0.1 * v * feel.stretch) }
}

/** Phase near `near` at which blob `i` sits at orbit angle `phi` (monotonic, so bisect). */
function crossing(near: number, i: number, phi: number, feel: SpinnerFeel): number {
  const TAU = Math.PI * 2
  const g = (p: number): number => {
    const q = p - i * feel.lag
    return TAU * q - feel.surge * Math.sin(TAU * q) - i * feel.gap - phi
  }
  const target = Math.round(g(near) / TAU) * TAU
  let lo = near - 1
  let hi = near + 1
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2
    if (g(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Drip slots at phase `p`. Event e sheds from blob e % n near the top of the orbit, around
 * phase e * SPACING. It swells under the blob, necks, detaches, then falls straight down
 * (gravity is screen-down whatever the rotation) and shrinks onto the goo vanish radius at
 * the bottom of the box. Slots with nothing alive are zero-radius circles.
 */
function dripCircles(p: number, n: number, feel: SpinnerFeel, vanish: number): SpinnerCircle[] {
  const out: SpinnerCircle[] = Array.from({ length: SPINNER_MAX_DRIPS * DRIP_CIRCLES }, () => ({ x: 0, y: 0, r: 0 }))
  const rBase = Math.min(0.11, Math.max(0.085, vanish * 1.5))
  if (vanish * 1.3 > 0.11) return out
  const SW = SPINNER_DRIP_SWELL
  const FALL = SPINNER_DRIP_FALL
  const e0 = Math.floor(p / SPINNER_DRIP_SPACING)
  for (let e = Math.max(0, e0 - 3); e <= e0 + 3; e++) {
    const i = e % n
    const phi = -Math.PI / 2 + 0.45 * Math.sin(e * 2.399)
    const ps = crossing(e * SPINNER_DRIP_SPACING, i, phi, feel)
    if (p < ps - SW || p >= ps + FALL) continue
    const rd = rBase * (1 + 0.12 * Math.sin(e * 1.7 + 1))
    const slot = (e % SPINNER_MAX_DRIPS) * DRIP_CIRCLES
    if (p < ps) {
      const u = (p - (ps - SW)) / SW
      const s = smooth(u)
      const h = headAt(p, i, n, feel)
      const off = (0.5 * h.r + 0.7 * rd) * s
      const d = { x: h.x, y: h.y + off, r: rd * (0.4 + 0.6 * s) }
      out[slot] = d
      const neckR = rd * 0.7 * (1 - smooth((u - 0.5) / 0.5))
      for (let k = 1; k <= DRIP_NECK; k++) {
        const f = k / (DRIP_NECK + 1)
        out[slot + k] = { x: h.x, y: h.y + off * f, r: neckR }
      }
    } else {
      const q = (p - ps) / FALL
      const h = headAt(ps, i, n, feel)
      const y0 = h.y + 0.5 * h.r + 0.7 * rd
      const yEnd = 0.5 - 0.02
      const fade = 0.55
      const rm = vanish * 0.98
      const rA = Math.max(rd * (1 - 0.25 * Math.min(q, fade)), Math.min(rd, rm * 1.2))
      const k = Math.max(0, Math.min(1, (q - fade) / (1 - fade)))
      const r = q <= fade ? rA : rm + (rA - rm) * (1 - k) * (1 - k)
      out[slot] = { x: h.x, y: y0 + (yEnd - y0) * (0.25 * q + 0.75 * q * q), r: q >= 0.995 ? 0 : r }
    }
  }
  return out
}

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
  drips?: SpinnerDripOptions,
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
  return drips ? [...heads, ...tails, ...necks, ...dripCircles(p, n, feel, drips.vanish)] : [...heads, ...tails, ...necks]
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
  /** A couple of drips shed down through the middle as it turns. Default true; skipped
   *  below SPINNER_DRIP_MIN_SIZE px and under reduced motion. */
  drips?: boolean
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
  let withDrips = opts.drips !== false
  let builtDrips = false
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
      else blobs[i]!.set(c, c, 0)
    }
    renderer.flush()
  }

  const dripping = (): boolean => withDrips && !reduced && size >= SPINNER_DRIP_MIN_SIZE
  const drawNow = (): void =>
    draw(
      reduced
        ? spinnerStaticPose(count, feel)
        : spinnerPose(phase, count, feel, neck, dripping() ? { vanish: gooVanishRadius(params) / size } : undefined),
    )

  const build = (): void => {
    for (const b of blobs) b.remove()
    renderer?.destroy()
    size = measure()
    builtDrips = withDrips && !reduced
    params = spinnerGooParams(size, feel)
    renderer = resolveRenderer(opts.renderer)(host, params)
    // No body: the spinner is only blobs.
    renderer.setBodyScale(0, 0)
    renderer.setPadding({ side: pad(), bottom: pad() })
    blobs = Array.from({ length: spinnerCircleCount(count, builtDrips) }, () => renderer!.createBlob())
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
    if (withDrips && !reduced !== builtDrips) build()
    else drawNow()
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
      const nextDrips = opts.drips !== false
      const rebuild = rendererChanged || nextCount !== count || nextDrips !== withDrips || (nextDrips && !readReduced()) !== builtDrips || nextFeel.softness !== feel.softness
      feel = nextFeel
      count = nextCount
      withDrips = nextDrips
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

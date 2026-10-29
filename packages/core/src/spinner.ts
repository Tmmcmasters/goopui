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
import { hangingDrip } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { trackPointer, type PointerTracker } from './pointer'
import {
  createSpinnerJelly,
  SPINNER_GRAB_LUMPS,
  SPINNER_INTERACT,
  SPINNER_NO_INTERACTION,
  type SpinnerInteractFlags,
} from './spinner-interact'

export const SPINNER_MIN_BLOBS = 3
export const SPINNER_MAX_BLOBS = 6
export const SPINNER_DEFAULT_BLOBS = 4
/** Drips alive at once, at most (each is a drip circle plus a two-circle neck). */
export const SPINNER_MAX_DRIPS = 3
/** Turns between drip sheds, on average. */
export const SPINNER_DRIP_SPACING = 0.5
/** Turns a drip spends swelling and hanging off its blob, then falling away below the box. */
export const SPINNER_DRIP_SWELL = 0.24
export const SPINNER_DRIP_FALL = 0.6
/** How far below the box (fraction of the size) a drip falls before it vanishes. */
export const SPINNER_DRIP_OVERHANG = 0.35
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

// Surge stays well under 1 so the slowest point of a turn still moves at more than half speed:
// the spinner never looks like it stalls.
export const SPINNER_FEEL: Readonly<Record<GoopPreset, Readonly<SpinnerFeel>>> = Object.freeze({
  subtle: Object.freeze({ period: 1.3, surge: 0.3, lag: 0.07, gap: 0.36, stretch: 0.6, softness: 0.055 }),
  playful: Object.freeze({ period: 1.1, surge: 0.42, lag: 0.09, gap: 0.34, stretch: 1, softness: 0.06 }),
  wild: Object.freeze({ period: 0.9, surge: 0.55, lag: 0.11, gap: 0.32, stretch: 1.4, softness: 0.065 }),
})

/**
 * Spinner shapes. `orbit`: blobs chasing round a circle, merging and splitting (drips only
 * here). `comet`: one goo arc that grows and shrinks as it spins. `ring`: a goo donut with a
 * fat bead rolling round it. `dots`: three dots, a bead rolls back and forth and swells each
 * one it passes. `pulse`: a core that buds satellites which stretch out and get pulled back.
 */
export type SpinnerVariant = 'orbit' | 'comet' | 'ring' | 'dots' | 'pulse'
export const SPINNER_VARIANTS: readonly SpinnerVariant[] = Object.freeze(['orbit', 'comet', 'ring', 'dots', 'pulse'])
export const SPINNER_DEFAULT_VARIANT: SpinnerVariant = 'orbit'

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

const COMET_CIRCLES = 14
const RING_CIRCLES = 16
const RING_BEAD = 3
const DOTS = 3
const DOTS_BEAD = 3

const toVariant = (v: string | undefined): SpinnerVariant =>
  SPINNER_VARIANTS.includes(v as SpinnerVariant) ? (v as SpinnerVariant) : SPINNER_DEFAULT_VARIANT

/** Circles drawn for `blobs` blobs of `variant`. Orbit: a head and a tail each, plus the neck
 *  (and drip slots). Pulse: a core plus a satellite and a neck per blob. Others are fixed.
 *  `grab` adds SPINNER_GRAB_LUMPS slots for the grab stretch. */
export const spinnerCircleCount = (blobs: number, drips = false, variant: SpinnerVariant = 'orbit', grab = false): number =>
  poseCircleCount(blobs, drips, variant) + (grab ? SPINNER_GRAB_LUMPS : 0)

const poseCircleCount = (blobs: number, drips: boolean, variant: SpinnerVariant): number => {
  switch (toVariant(variant)) {
    case 'comet':
      return COMET_CIRCLES
    case 'ring':
      return RING_CIRCLES + RING_BEAD
    case 'dots':
      return DOTS + DOTS_BEAD
    case 'pulse':
      return 1 + clampBlobs(blobs) * 2
    default:
      return clampBlobs(blobs) * 2 + NECK_CIRCLES + (drips ? SPINNER_MAX_DRIPS * DRIP_CIRCLES : 0)
  }
}

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
 * Drip slots at phase `p`. Event e sheds from blob e % n as it passes the bottom of the orbit,
 * around phase e * SPACING. It swells under the blob, hangs and stretches on a neck, detaches,
 * then falls straight down (gravity is screen-down whatever the rotation) and shrinks onto the
 * goo vanish radius SPINNER_DRIP_OVERHANG below the box. Empty slots are zero-radius circles.
 */
function dripCircles(p: number, n: number, feel: SpinnerFeel, vanish: number): SpinnerCircle[] {
  const out: SpinnerCircle[] = Array.from({ length: SPINNER_MAX_DRIPS * DRIP_CIRCLES }, () => ({ x: 0, y: 0, r: 0 }))
  const rBase = Math.min(0.13, Math.max(0.11, vanish * 1.8))
  if (vanish * 1.3 > 0.13) return out
  const SW = SPINNER_DRIP_SWELL
  const FALL = SPINNER_DRIP_FALL
  const e0 = Math.floor(p / SPINNER_DRIP_SPACING)
  for (let e = Math.max(0, e0 - 3); e <= e0 + 3; e++) {
    const i = e % n
    // Shed from (nearly) dead top, so the drop falls straight through the center.
    const phi = Math.PI / 2 + 0.06 * Math.sin(e * 2.399)
    const ps = crossing(e * SPINNER_DRIP_SPACING, i, phi, feel)
    if (p < ps - SW || p >= ps + FALL) continue
    const rd = rBase * (1 + 0.12 * Math.sin(e * 1.7 + 1))
    const slot = (e % SPINNER_MAX_DRIPS) * DRIP_CIRCLES
    if (p < ps) {
      const u = (p - (ps - SW)) / SW
      const h = headAt(p, i, n, feel)
      // Hang: swell under the blob, then stretch away on a lengthening neck before letting go.
      hangingDrip(u, h.x, h.y, h.r, rd, DRIP_NECK).forEach((c, k) => (out[slot + k] = c))
    } else {
      const q = (p - ps) / FALL
      const h = headAt(ps, i, n, feel)
      const y0 = h.y + 0.5 * h.r + 1.6 * rd
      const yEnd = 0.5 + SPINNER_DRIP_OVERHANG
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
  // between their edges passes ~one small radius. Reconnects only once they're nearly touching.
  const A = heads[n - 2]!
  const B = heads[n - 1]!
  const d = Math.hypot(A.x - B.x, A.y - B.y)
  const touch = (A.r + B.r) * 0.92
  const snap = touch + B.r * 1.15
  const stretch = Math.max(0, Math.min(1, (d - touch) / (snap - touch)))
  if (stretch <= 0.15) neck.necked = true
  else if (d >= snap) neck.necked = false
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

const TAU = Math.PI * 2
const bell = (d: number, w: number): number => Math.exp(-(d * d) / (w * w))
/** Signed angle difference wrapped to -π..π. */
const wrapAngle = (a: number): number => a - TAU * Math.round(a / TAU)

/** Comet: an arc that spins at a steady rate while its length breathes (every two turns). */
function cometPose(p: number, feel: SpinnerFeel): SpinnerCircle[] {
  const breathe = 0.5 - 0.5 * Math.cos(Math.PI * p)
  const len = Math.PI * (0.45 + 0.85 * breathe)
  // The head runs ahead while the arc grows and the tail catches up while it shrinks.
  const head = TAU * p + 0.5 * len
  const out: SpinnerCircle[] = []
  for (let k = 0; k < COMET_CIRCLES; k++) {
    const f = k / (COMET_CIRCLES - 1)
    const th = head - len * f
    // A slight inward sag toward the tail, so it reads as liquid flung round, not a stroke.
    const rr = 0.3 - 0.025 * f * f * feel.stretch
    const r = 0.135 * (1 - 0.7 * Math.pow(f, 0.85))
    out.push({ x: rr * Math.cos(th), y: rr * Math.sin(th), r })
  }
  return out
}

/** Ring: a goo donut. A bead rolls round it at a steady rate, swelling the ring as it goes. */
function ringPose(p: number, feel: SpinnerFeel): SpinnerCircle[] {
  const bead = TAU * p
  const out: SpinnerCircle[] = []
  for (let k = 0; k < RING_CIRCLES; k++) {
    const th = (TAU * k) / RING_CIRCLES
    const near = bell(wrapAngle(th - bead), 0.7)
    // The bead pushes the ring out a little where it passes, and the far side thins.
    const rr = 0.3 + 0.012 * near
    out.push({ x: rr * Math.cos(th), y: rr * Math.sin(th), r: 0.078 + 0.03 * near })
  }
  for (let k = 0; k < RING_BEAD; k++) {
    const th = bead - k * 0.32 * feel.stretch
    const r = 0.13 * (1 - 0.25 * k)
    out.push({ x: 0.3 * Math.cos(th), y: 0.3 * Math.sin(th), r })
  }
  return out
}

/** Dots: three dots in a row. A bead rolls back and forth along them (eased at the ends),
 *  and each dot swells, lifts and leans toward it as it passes. */
function dotsPose(p: number, feel: SpinnerFeel): SpinnerCircle[] {
  const X = 0.3
  const s = Math.sin(TAU * p * 0.5)
  const bx = X * s
  // Velocity sign, for the trailing smear behind the bead.
  const dir = Math.cos(TAU * p * 0.5)
  const out: SpinnerCircle[] = []
  for (let k = 0; k < DOTS; k++) {
    const x0 = (k - 1) * X
    const near = bell(bx - x0, 0.14)
    out.push({ x: x0 + 0.045 * (bx - x0) * near, y: -0.05 * near, r: 0.1 + 0.035 * near })
  }
  for (let k = 0; k < DOTS_BEAD; k++) {
    const x = bx - k * 0.07 * dir * feel.stretch
    out.push({ x, y: -0.03, r: 0.11 * (1 - 0.3 * k) })
  }
  return out
}

/** Pulse: a breathing core that buds `n` satellites. Each stretches out on a neck, the neck
 *  snaps, and it gets pulled back in, staggered, while the whole thing turns slowly. */
function pulsePose(p: number, n: number, feel: SpinnerFeel): SpinnerCircle[] {
  const out: SpinnerCircle[] = [{ x: 0, y: 0, r: 0.14 + 0.02 * Math.sin(TAU * p) }]
  const spin = TAU * p * 0.25
  for (let k = 0; k < n; k++) {
    const t = (((p * 0.9 + k / n) % 1) + 1) % 1
    const reach = Math.pow(Math.sin(Math.PI * t), 1.4)
    const d = 0.32 * reach
    const th = spin + (TAU * k) / n
    const r = 0.11 * (1 - 0.2 * reach)
    out.push({ x: d * Math.cos(th), y: d * Math.sin(th), r })
    // The neck thins as the satellite reaches out and is gone near full reach.
    const neck = 0.07 * Math.max(0, 1 - reach / (0.6 + 0.1 * feel.stretch))
    out.push({ x: 0.5 * d * Math.cos(th), y: 0.5 * d * Math.sin(th), r: neck })
  }
  return out
}

/**
 * The circles of `variant` at phase `p` (in turns). Pure. `orbit` is `spinnerPose` (pass the
 * same `neck` object every frame, and `drips` to shed drips); other variants ignore both.
 */
export function spinnerVariantPose(
  variant: SpinnerVariant,
  p: number,
  blobs: number = SPINNER_DEFAULT_BLOBS,
  feel: SpinnerFeel = SPINNER_FEEL.playful,
  neck: SpinnerNeckState = { necked: true },
  drips?: SpinnerDripOptions,
): SpinnerCircle[] {
  switch (toVariant(variant)) {
    case 'comet':
      return cometPose(p, feel)
    case 'ring':
      return ringPose(p, feel)
    case 'dots':
      return dotsPose(p, feel)
    case 'pulse':
      return pulsePose(p, clampBlobs(blobs), feel)
    default:
      return spinnerPose(p, blobs, feel, neck, drips)
  }
}

/** Phase of each variant's still pose (reduced motion, SSR fallback). */
const STATIC_PHASE: Record<SpinnerVariant, number> = { orbit: 0.03, comet: 0.6, ring: 0.1, dots: 0.12, pulse: 0.35 }

/** The still pose for reduced motion (and the SSR fallback). Orbit: the chain eased and merged. */
export function spinnerStaticPose(
  blobs: number = SPINNER_DEFAULT_BLOBS,
  feel: SpinnerFeel = SPINNER_FEEL.playful,
  variant: SpinnerVariant = SPINNER_DEFAULT_VARIANT,
): SpinnerCircle[] {
  const v = toVariant(variant)
  return spinnerVariantPose(v, STATIC_PHASE[v], blobs, feel, { necked: true })
}

/** Goo filter parameters for a spinner of `size` px (blur scales with size). */
export function spinnerGooParams(size: number, feel: SpinnerFeel = SPINNER_FEEL.playful): GooFilterParams {
  // Quarter-px steps so spinners of similar size share one filter.
  const blur = Math.max(0.5, Math.round(size * feel.softness * 4) / 4)
  return { blur, contrast: 20, threshold: 0.4 }
}

export interface SpinnerOptions {
  /** Shape: 'orbit' (default) | 'comet' | 'ring' | 'dots' | 'pulse'. */
  variant?: SpinnerVariant
  /** Number of blobs, 3..6 (orbit and pulse). Default 4. */
  blobs?: number
  /** Orbit speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** Drips hang off the bottom of the orbit and fall away as it turns. Default false; orbit
   *  only, skipped below SPINNER_DRIP_MIN_SIZE px and under reduced motion. */
  drips?: boolean
  /** Master switch for pointer play (slosh, grab, pop). Default true. Never under reduced motion. */
  interactive?: boolean
  /** Moving the pointer over (and a little around) it sloshes the goo. Default true. */
  slosh?: boolean
  /** Press and drag pulls the goo out in fat lumps; release snaps it back. Default true.
   *  Uses pointer capture and `touch-action: none` on the host; never cancels clicks. */
  grab?: boolean
  /** Click / tap squishes it, then it swells back with a ripple. Default true. */
  pop?: boolean
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
  let variant = toVariant(opts.variant)
  let withDrips = opts.drips === true && variant === 'orbit'
  let builtDrips = false
  const neck: SpinnerNeckState = { necked: true }
  const jelly = createSpinnerJelly()
  /** Play level the layer was built for: 0 none, 1 slosh/pop (small pad), 2 grab (lump slots + big pad). */
  let builtPlay = 0
  let phase = 0
  let destroyed = false
  let visible = true

  const readReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  const wants = (k: 'slosh' | 'grab' | 'pop'): boolean => opts.interactive !== false && opts[k] !== false
  const playLevel = (): number => (wants('grab') ? 2 : wants('slosh') || wants('pop') ? 1 : 0)
  const flags = (): SpinnerInteractFlags =>
    reduced ? SPINNER_NO_INTERACTION : { slosh: wants('slosh'), grab: builtPlay === 2, pop: wants('pop') }

  const measure = (): number => {
    const w = host.clientWidth || host.offsetWidth
    const h = host.clientHeight || host.offsetHeight
    const s = Math.min(w, h) || Math.max(w, h)
    return s > 0 ? s : 16
  }

  // Room for slosh / ripple (and the grab stretch) to reach past the box.
  const playPad = (): number =>
    builtPlay === 2
      ? Math.ceil(size * (SPINNER_INTERACT.grabReach + SPINNER_INTERACT.grabEnd * 1.4))
      : builtPlay === 1
        ? Math.ceil(size * (SPINNER_INTERACT.maxSlosh + 0.06))
        : 0
  const pad = (): number => Math.ceil(params.blur * 3) + playPad()
  // Room for drips to fall a little below the box.
  const bottomPad = (): number =>
    Math.ceil(params.blur * 3) + Math.max(playPad(), builtDrips ? Math.ceil(size * SPINNER_DRIP_OVERHANG) : 0)

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
  const basePose = (): SpinnerCircle[] =>
    reduced
      ? spinnerStaticPose(count, feel, variant)
      : spinnerVariantPose(variant, phase, count, feel, neck, dripping() ? { vanish: gooVanishRadius(params) / size } : undefined)
  const deform = (base: SpinnerCircle[]): SpinnerCircle[] =>
    builtPlay > 0 && !reduced ? jelly.apply(base, flags(), gooVanishRadius(params) / size) : base
  const drawNow = (): void => draw(deform(basePose()))

  // ---- pointer play ----
  const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())
  let tracker: PointerTracker | null = null
  let rect: DOMRect | null = null
  let rectAt = -Infinity
  let pid: number | null = null
  const readRect = (fresh = false): DOMRect => {
    const t = now()
    if (fresh || !rect || t - rectAt > 150) {
      rect = host.getBoundingClientRect()
      rectAt = t
    }
    return rect
  }
  const toUnit = (cx: number, cy: number, fresh = false): { x: number; y: number } => {
    const r = readRect(fresh)
    return { x: (cx - (r.left + r.width / 2)) / size, y: (cy - (r.top + r.height / 2)) / size }
  }
  /** Hovering pointer in unit space (null when still or away). Velocity is scaled by
   *  sqrt(size * ref), so small spinners move a bit more relative to their size, less in px. */
  const hoverPointer = () => {
    if (!tracker) return null
    const s = tracker.sample()
    if (s.speed < 1) return null
    const u = toUnit(s.x, s.y)
    const m = 0.5 + SPINNER_INTERACT.hoverMargin
    if (Math.abs(u.x) > m || Math.abs(u.y) > m) return null
    const k = Math.sqrt(size * SPINNER_INTERACT.sloshRefSize)
    return { x: u.x, y: u.y, vx: s.vx / k, vy: s.vy / k }
  }
  const syncPlay = (): void => {
    const wantTrack = !reduced && !destroyed && wants('slosh')
    if (wantTrack && !tracker) tracker = trackPointer(doc)
    else if (!wantTrack && tracker) {
      tracker.release()
      tracker = null
    }
    host.style.touchAction = wants('grab') ? 'none' : prevTouchAction
    if (reduced || builtPlay === 0) {
      endPress(false)
      jelly.reset()
    }
  }
  const endPress = (click: boolean): void => {
    if (pid === null) return
    const id = pid
    pid = null
    jelly.release(click)
    try {
      if (host.hasPointerCapture?.(id)) host.releasePointerCapture(id)
    } catch {
      /* already released */
    }
  }
  // Never preventDefault / stopPropagation: it often sits inside a button that must still click.
  const onDown = (e: PointerEvent): void => {
    const f = flags()
    if ((!f.grab && !f.pop) || pid !== null) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pid = e.pointerId
    try {
      host.setPointerCapture?.(e.pointerId)
    } catch {
      /* capture unsupported: moves still arrive while over the host */
    }
    const u = toUnit(e.clientX, e.clientY, true)
    jelly.press(u.x, u.y)
  }
  const onMove = (e: PointerEvent): void => {
    if (e.pointerId !== pid) return
    const u = toUnit(e.clientX, e.clientY)
    const T = SPINNER_INTERACT
    jelly.drag(u.x, u.y, flags().grab ? Math.max(T.grabThreshold, T.grabThresholdPx / size) : Infinity)
  }
  const onUp = (e: PointerEvent): void => {
    if (e.pointerId === pid) endPress(e.type === 'pointerup')
  }

  const build = (): void => {
    for (const b of blobs) b.remove()
    renderer?.destroy()
    size = measure()
    builtDrips = withDrips && !reduced
    builtPlay = playLevel()
    params = spinnerGooParams(size, feel)
    renderer = resolveRenderer(opts.renderer)(host, params)
    // No body: the spinner is only blobs.
    renderer.setBodyScale(0, 0)
    renderer.setPadding({ side: pad(), bottom: bottomPad() })
    blobs = Array.from({ length: spinnerCircleCount(count, builtDrips, variant, builtPlay === 2) }, () => renderer!.createBlob())
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
    renderer.setPadding({ side: pad(), bottom: bottomPad() })
    drawNow()
  }

  // No document.visibilityState gate: browsers already stop rAF in hidden tabs (and the loop
  // clamps dt on resume), while headless / multi-tab renderers (e.g. Remotion's parallel
  // tabs) report 'hidden' but still paint. Gating on it froze those spinners on their first
  // pose, so frames alternated between a moving and a frozen spinner (flash + stutter).
  const shouldRun = (): boolean => !destroyed && !reduced && visible
  const tick: Ticker = (dt) => {
    if (!shouldRun()) return false
    phase += (dt * Math.max(0, opts.speed ?? 1)) / feel.period
    if (phase > 1e6) phase -= Math.floor(phase)
    const base = basePose()
    if (builtPlay > 0) {
      const f = flags()
      jelly.setPointer(f.slosh ? hoverPointer() : null)
      jelly.step(base, dt, f)
    }
    draw(deform(base))
    return true
  }
  const sync = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  const prevTouchAction = host.style.touchAction
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  build()
  syncPlay()
  host.addEventListener('pointerdown', onDown)
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('pointercancel', onUp)
  host.addEventListener('lostpointercapture', onUp)

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
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    syncPlay()
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
      const nextVariant = toVariant(opts.variant)
      const nextDrips = opts.drips === true && nextVariant === 'orbit'
      const rebuild =
        rendererChanged ||
        nextVariant !== variant ||
        nextCount !== count ||
        nextDrips !== withDrips ||
        playLevel() !== builtPlay ||
        (nextDrips && !readReduced()) !== builtDrips ||
        nextFeel.softness !== feel.softness
      feel = nextFeel
      count = nextCount
      variant = nextVariant
      withDrips = nextDrips
      reduced = readReduced()
      if (rebuild) build()
      syncPlay()
      drawNow()
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
      endPress(false)
      syncPlay()
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointercancel', onUp)
      host.removeEventListener('lostpointercapture', onUp)
      io?.disconnect()
      ro?.disconnect()
      unwatch()
      for (const b of blobs) b.remove()
      blobs = []
      renderer?.destroy()
      renderer = null
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
      host.style.touchAction = prevTouchAction
    },
  }
}

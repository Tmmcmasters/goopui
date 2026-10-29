// Emerge momentum: the goo keeps moving after the panel lands.
//
// Open slosh: the panel's mass carries past its resting shape, so the FAR edge (facing away
// from the anchor) bulges out, rebounds and wobbles a few times before settling.
// Open drips: the whole far edge bursts like a button hit, scaled up to an edge. A quick
// ripple runs along the far edge from opposite the bridge, and as it passes, a spray tears
// off: big lead globs (on short necks), mid drops and fine specks (the button's hit-spray
// size classes, GOOP_PHYSICS.erupt*) spread over the whole length, flung outward in the open
// direction with a fanned cone, then falling (screen-down gravity) and shrinking away.
// Close slosh: on the suck-back the goo lags; the far edge trails and the NEAR edge sloshes
// against the anchor.
//
// Pure: `emergeMomentum` decorates an `emergePose` with these, given the seconds since the
// phase started (speed-scaled). It appends a fixed EMERGE_MOMENTUM_CIRCLES circles (zero
// radius when unused) and nudges the body's near/far edges. Only types come from ./emerge,
// so the two modules don't form a runtime cycle.

import { GOOP_PHYSICS, type GoopPreset } from './constants'
import type { EmergeBody, EmergeBridge, EmergeCircle, EmergePhase, EmergePose, EmergeRect } from './emerge'

/** Effect toggles: `true` (1) / `false` (0), or a 0..2 strength multiplier. Default true. */
export interface EmergeMomentumEffects {
  /** Far edge bulges past rest, rebounds and wobbles after the open. */
  openSlosh?: boolean | number
  /** The whole far edge bursts on open: a spray of globs, drops and specks flung outward
   *  that fall and fade. `true` / `false` or a 0..2 strength (count and fling). */
  openDrips?: boolean | number
  /** Goo lags on close; the near edge sloshes against the anchor. */
  closeSlosh?: boolean | number
}

/** Open-burst knobs (numbers; out-of-range values clamp to EMERGE_DRIP_KNOBS' min..max). */
export interface EmergeDripOptions {
  /** Drop count scale (x the preset's count). Default 1; 0 sheds none. */
  openDripAmount?: number
  /** Drop size scale. Default 1. */
  openDripSize?: number
  /** Fling distance / launch speed scale. Default 1. */
  openDripFling?: number
  /** 0..1: how mixed the spray is (big lead globs vs specks, uneven spacing, timing and
   *  angles). 0 makes every drop alike. Default 0.7. */
  openDripVariety?: number
}

/** Range, default and description of each open-burst knob (for sliders / docs). */
export const EMERGE_DRIP_KNOBS = Object.freeze({
  openDripAmount: Object.freeze({ default: 1, min: 0, max: 3, step: 0.05, label: 'Drip amount', description: 'How many drops the far edge sheds (x the preset).' }),
  openDripSize: Object.freeze({ default: 1, min: 0.3, max: 2.5, step: 0.05, label: 'Drip size', description: 'Size of the burst drops.' }),
  openDripFling: Object.freeze({ default: 1, min: 0, max: 3, step: 0.05, label: 'Drip fling', description: 'How far the drops are flung before they fall.' }),
  openDripVariety: Object.freeze({ default: 0.7, min: 0, max: 1, step: 0.05, label: 'Drip variety', description: 'Mix of big globs, drops and specks, and how uneven the spray is; 0 makes them alike.' }),
}) as Readonly<Record<keyof EmergeDripOptions, Readonly<{ default: number; min: number; max: number; step: number; label: string; description: string }>>>

/** A burst knob's value: default when unset / not finite, clamped to its range. */
export function emergeDripKnob(key: keyof EmergeDripOptions, v: number | undefined): number {
  const k = EMERGE_DRIP_KNOBS[key]
  return v === undefined || !Number.isFinite(v) ? k.default : Math.min(k.max, Math.max(k.min, v))
}

/** Tuning. Times in seconds (at speed 1), lengths in bulb radii unless noted. */
export const EMERGE_MOMENTUM = Object.freeze({
  /** Per-preset scale: slosh amplitude, drip count, drip size, drip launch. */
  preset: Object.freeze({
    subtle: Object.freeze({ slosh: 0.55, drips: 4, dripSize: 0.85, launch: 0.7 }),
    playful: Object.freeze({ slosh: 1, drips: 13, dripSize: 1, launch: 1 }),
    wild: Object.freeze({ slosh: 1.6, drips: 22, dripSize: 1.2, launch: 1.4 }),
  }) as Readonly<Record<GoopPreset, Readonly<{ slosh: number; drips: number; dripSize: number; launch: number }>>>,
  slosh: Object.freeze({
    /** When the far-edge spring is kicked (s after open starts: about when the panel lands). */
    start: 0.14,
    /** Peak outward bulge, bulb radii (capped by `maxPx`). */
    amp: 0.9,
    maxPx: 22,
    /** Wobble frequency (Hz) and exponential damping (1/s). */
    freq: 4.2,
    damping: 4.6,
    /** Hard stop (s after `start`); the tail is eased to exactly zero by then. */
    duration: 0.75,
    /** Rebound: fraction of a negative swing that pulls the far edge in, capped in px. */
    inward: 0.45,
    maxInward: 5,
    /** Bulge circle radius as a fraction of the panel's breadth (the bulge's width). */
    width: 0.4,
  }),
  close: Object.freeze({
    /** Near-edge slosh against the anchor: peak, bulb radii. */
    amp: 0.55,
    freq: 7,
    damping: 9,
    /** Far edge trails the suck-back by up to this many bulb radii. */
    lag: 0.6,
    /** Everything has settled this long (s) into the close. */
    duration: 0.26,
  }),
  drips: Object.freeze({
    /** The burst ripple starts along the far edge (s after open starts) and reaches the far
     *  end of the edge `ripple` s later; each drop tears off as the ripple passes it. */
    start: 0.1,
    ripple: 0.14,
    /** Ripple bump radius (bulb radii) and how far it pushes out of the edge (x radius). */
    rippleSize: 0.5,
    ripplePush: 0.8,
    /** Lead globs neck out of the edge for this long before they let go (mids half that). */
    swell: 0.1,
    /** Release-time jitter (s, x variety). */
    jitter: 0.04,
    /** Flight + fall + fade time after letting go, per class: lead, mid, speck. */
    life: Object.freeze([0.62, 0.55, 0.42] as const),
    /** Size unit (bulb radii; the hit-spray classes multiply it) and the smallest speck (px). */
    unit: 0.34,
    minPx: 3,
    /** Drop count scales with the edge's breadth (px per unit) within these bounds. */
    edgeRef: 220,
    edgeScale: Object.freeze([0.6, 1.5] as const),
    /** Share of drops that are lead globs / mid drops (the rest are specks). */
    leads: 0.14,
    mids: 0.36,
    /** Launch speed along the open direction (px/s) on top of a share of the far edge's own
     *  speed, and the drag that bleeds it off (1/s). */
    launch: 300,
    carry: 0.6,
    drag: 4.5,
    /** Cone half-angle (rad) per class, and the outward fan toward the edge's ends (rad). */
    cone: Object.freeze([0.2, 0.45, 0.8] as const),
    fan: 0.5,
    /** Screen-down gravity (px/s^2). */
    gravity: 1100,
    /** Shrink to nothing over the last fraction of `life`. */
    fade: 0.55,
  }),
  /** Bloom flow style: the puddle lands everywhere at once, so the slosh rings all four edges
   *  and a big all-around splash flies off the whole perimeter (a slapped puddle). */
  bloom: Object.freeze({
    /** Per-preset splash: drop count (x the perimeter scale), launch and size scale. */
    preset: Object.freeze({
      subtle: Object.freeze({ drips: 10, launch: 0.8, size: 0.9 }),
      playful: Object.freeze({ drips: 26, launch: 1.3, size: 1.12 }),
      wild: Object.freeze({ drips: 38, launch: 1.7, size: 1.3 }),
    }) as Readonly<Record<GoopPreset, Readonly<{ drips: number; launch: number; size: number }>>>,
    /** Perimeter (w + h, px) at scale 1, and the scale's bounds. */
    perimRef: 420,
    perimScale: Object.freeze([0.55, 1.25] as const),
    /** Slosh: per-edge kick delay (s; top, right, bottom, left) so the ring wobbles unevenly. */
    lag: Object.freeze([0, 0.022, 0.01, 0.032] as const),
    /** Slosh size floor: fraction of the panel's smaller side (the anchor may be tiny). */
    sloshRef: 0.12,
    /** Outward fan along each edge (rad), so drops near corners fly diagonally. */
    fan: 0.7,
    /** Extra release spread (s): the splash goes off nearly all at once. */
    spread: 0.05,
    /** Keep-out around the trigger (px): drops whose path would cross it are deflected away
     *  (up to `deflect` rad), then slowed, then moved to the opposite edge, else dropped. */
    keepOut: 3,
    deflect: Object.freeze([0, 0.25, 0.5, 0.75, 1, 1.25] as const),
    slow: Object.freeze([1, 0.6] as const),
  }),
})

/** Most drops one burst sheds (one circle each); the first EMERGE_MOMENTUM_NECKS lead globs
 *  also get a neck circle. */
export const EMERGE_MOMENTUM_DRIPS = 40
export const EMERGE_MOMENTUM_NECKS = 6
const BULGE_CIRCLES = 3
/** Two ripple fronts (left/right of the origin), each a bump + a trailing bump. */
const RIPPLE_CIRCLES = 4
const RIPPLE_AT = BULGE_CIRCLES
const NECK_AT = RIPPLE_AT + RIPPLE_CIRCLES
const DRIP_AT = NECK_AT + EMERGE_MOMENTUM_NECKS
/** Circles `emergeMomentum` appends: bulge + ripple + necks + drops. Always this many (zero
 *  radius when idle). */
export const EMERGE_MOMENTUM_CIRCLES = DRIP_AT + EMERGE_MOMENTUM_DRIPS

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))
const smooth = (x: number): number => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const zero = (): EmergeCircle => ({ x: 0, y: 0, r: 0 })

/** Strength of a toggle: true/undefined -> 1, false -> 0, numbers clamped to 0..2. */
export function emergeMomentumStrength(v: boolean | number | undefined): number {
  if (v === undefined || v === true) return 1
  if (v === false || !Number.isFinite(v)) return 0
  return clamp(v, 0, 2)
}

/** Seconds (speed-scaled) after the phase starts by which all momentum has settled. */
export function emergeMomentumEnd(phase: EmergePhase): number {
  const M = EMERGE_MOMENTUM
  if (phase === 'close') return M.close.duration
  const d = M.drips
  const drips = d.start + d.ripple + d.jitter + Math.max(...d.life) * 1.15
  return Math.max(M.slosh.start + M.slosh.duration, drips)
}

/** Deterministic 0..1 hash of (seed, a, b). */
function rand(seed: number, a: number, b: number): number {
  const s = Math.sin(seed * 127.1 + a * 311.7 + b * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Panel body in main/cross terms (main grows away from the anchor). */
interface Span {
  near: number
  far: number
  lo: number
  hi: number
}

type Frame = Pick<EmergeBridge, 'side' | 'width' | 'height'>

function toLocal(b: Frame, main: number, cross: number): { x: number; y: number } {
  switch (b.side) {
    case 'bottom':
      return { x: cross, y: main }
    case 'top':
      return { x: cross, y: b.height - main }
    case 'right':
      return { x: main, y: cross }
    default:
      return { x: b.width - main, y: cross }
  }
}

function spanOf(body: EmergeBody, b: Frame): Span | null {
  if (body.w <= 0 || body.h <= 0) return null
  const x0 = body.cx - body.w / 2
  const x1 = body.cx + body.w / 2
  const y0 = body.cy - body.h / 2
  const y1 = body.cy + body.h / 2
  switch (b.side) {
    case 'bottom':
      return { near: y0, far: y1, lo: x0, hi: x1 }
    case 'top':
      return { near: b.height - y1, far: b.height - y0, lo: x0, hi: x1 }
    case 'right':
      return { near: x0, far: x1, lo: y0, hi: y1 }
    default:
      return { near: b.width - x1, far: b.width - x0, lo: y0, hi: y1 }
  }
}

function bodyOf(s: Span, b: Frame): EmergeBody {
  const c = toLocal(b, (s.near + s.far) / 2, (s.lo + s.hi) / 2)
  const extent = Math.max(0, s.far - s.near)
  const cross = s.hi - s.lo
  const vertical = b.side === 'top' || b.side === 'bottom'
  return vertical ? { cx: c.x, cy: c.y, w: cross, h: extent } : { cx: c.x, cy: c.y, w: extent, h: cross }
}

/** Open far-edge displacement (px, + outward) at `sec`. Damped spring kicked outward, eased
 *  to exactly zero by the end. */
export function emergeSloshOffset(sec: number, bulb: number, strength: number, preset: GoopPreset = 'playful'): number {
  const S = EMERGE_MOMENTUM.slosh
  const tau = sec - S.start
  if (strength <= 0 || tau <= 0 || tau >= S.duration) return 0
  const amp = Math.min(S.maxPx, S.amp * bulb) * EMERGE_MOMENTUM.preset[preset].slosh * strength
  const env = Math.exp(-S.damping * tau) * (1 - smooth((tau - 0.5 * S.duration) / (0.5 * S.duration)))
  // Normalise so the first peak is ~amp (sin peaks at a quarter period, already decayed).
  const w = 2 * Math.PI * S.freq
  const norm = Math.exp(S.damping * (Math.PI / 2 / w))
  return amp * norm * env * Math.sin(w * tau)
}

/** Close near-edge slosh (px, + toward the anchor) and far-edge lag (px, + outward). */
export function emergeCloseSlosh(sec: number, bulb: number, strength: number, preset: GoopPreset = 'playful') {
  const C = EMERGE_MOMENTUM.close
  if (strength <= 0 || sec <= 0 || sec >= C.duration) return { near: 0, lag: 0 }
  const k = EMERGE_MOMENTUM.preset[preset].slosh * strength
  const end = 1 - smooth((sec - 0.5 * C.duration) / (0.5 * C.duration))
  const w = 2 * Math.PI * C.freq
  const near = C.amp * bulb * k * Math.exp(-C.damping * sec) * Math.sin(w * sec) * end * 1.6
  const lag = C.lag * bulb * k * Math.sin((Math.PI * sec) / C.duration)
  return { near, lag }
}

/** A dome of BULGE_CIRCLES circles pushing `d` px out of the edge at `edge` (main), facing
 *  `sign` (+1 away from the anchor, -1 toward it), across the span's cross range. */
function bulge(b: Frame, s: Span, edge: number, sign: 1 | -1, d: number, crossAt: number, out: EmergeCircle[], at: number): void {
  if (d < 0.5) return
  const breadth = s.hi - s.lo
  const extent = s.far - s.near
  const R = Math.max(0, Math.min(breadth * EMERGE_MOMENTUM.slosh.width, breadth / 2, extent / 2, 80))
  if (R < 1) return
  const cross = clamp(crossAt, s.lo + R, Math.max(s.lo + R, s.hi - R))
  const parts = [
    { dc: 0, k: 1, dd: 1 },
    { dc: -0.75, k: 0.72, dd: 0.45 },
    { dc: 0.75, k: 0.72, dd: 0.45 },
  ]
  for (let i = 0; i < BULGE_CIRCLES; i++) {
    const p = parts[i]!
    const r = R * p.k
    const dk = Math.min(d * p.dd, r)
    // Whole circle (plus a little goo margin) inside the cross range: the dome only pushes
    // out of `edge`. Sitting `r - dk` behind the edge, a flank circle that crossed the
    // panel's sides would bulge them out as big lobes for the whole slosh (tall panels).
    const m = r * 1.15
    const c = clamp(cross + p.dc * R, s.lo + m, Math.max(s.lo + m, s.hi - m))
    const pt = toLocal(b, edge + sign * (dk - r), c)
    out[at + i] = { x: pt.x, y: pt.y, r }
  }
}

export interface EmergeMomentumContext {
  /** Feel preset (scales everything). Default 'playful'. */
  preset?: GoopPreset
  /** Varies drop count, sizes and spots per open. Default 0. */
  seed?: number
  /** The open-phase body at `sec` (no momentum). Drops use it to find where and how fast the
   *  far edge was moving when they let go. Without it they leave from the current pose. */
  bodyAt?: (sec: number) => EmergeBody
  /** Bloom flow style: radial slosh on all four edges and an all-around splash that keeps
   *  clear of the trigger (`b.anchorRect`); no close slosh here (`closeSlosh` drives the
   *  bloom close pose's inward wobble in `emergePose`). */
  bloom?: boolean
}

/**
 * Decorate `pose` (from `emergePose`) with momentum at `sec` seconds into `phase` (speed-
 * scaled; may run past the phase's own end, see `emergeMomentumEnd`). Pure. The result has
 * `pose.circles` followed by EMERGE_MOMENTUM_CIRCLES more.
 */
export function emergeMomentum(
  pose: EmergePose,
  b: EmergeBridge,
  phase: EmergePhase,
  sec: number,
  effects: EmergeMomentumEffects & EmergeDripOptions = {},
  ctx: EmergeMomentumContext = {},
): EmergePose {
  const preset = ctx.preset ?? 'playful'
  const extra: EmergeCircle[] = Array.from({ length: EMERGE_MOMENTUM_CIRCLES }, zero)
  if (ctx.bloom) return bloomMomentum(pose, b, phase, sec, effects, ctx, preset, extra)
  const span = spanOf(pose.body, b)
  let body = pose.body
  if (span && phase === 'open') {
    const d = emergeSloshOffset(sec, b.bulb, emergeMomentumStrength(effects.openSlosh), preset)
    const S = EMERGE_MOMENTUM.slosh
    const s = { ...span }
    if (d < 0) s.far = Math.max(s.near + 1, s.far + Math.max(-S.maxInward, d * S.inward))
    else bulge(b, s, s.far, 1, d, (s.lo + s.hi) / 2, extra, 0)
    if (d < 0) body = bodyOf(s, b)
  } else if (span && phase === 'close') {
    const { near, lag } = emergeCloseSlosh(sec, b.bulb, emergeMomentumStrength(effects.closeSlosh), preset)
    if (lag > 0 || near !== 0) {
      const s = { ...span, far: span.far + lag }
      body = bodyOf(s, b)
      bulge(b, s, s.near, -1, near, b.targetCross, extra, 0)
    }
  }
  if (phase === 'open') drips(b, sec, emergeMomentumStrength(effects.openDrips), preset, ctx, effects, span, extra)
  return { body, circles: [...pose.circles, ...extra], content: pose.content }
}

/** Number of drops a burst sheds for this panel breadth, strength and knobs. Stable for a
 *  given panel (it doesn't change frame to frame). */
export function emergeDripCount(
  breadth: number,
  strength: number,
  preset: GoopPreset = 'playful',
  amount = 1,
): number {
  const D = EMERGE_MOMENTUM.drips
  if (strength <= 0 || amount <= 0 || breadth <= 0) return 0
  const edge = clamp(breadth / D.edgeRef, D.edgeScale[0], D.edgeScale[1])
  const n = EMERGE_MOMENTUM.preset[preset].drips * amount * edge * (0.6 + 0.4 * strength)
  return clamp(Math.round(n), 1, EMERGE_MOMENTUM_DRIPS)
}

/** One burst drop, fixed per (seed, index): class, spot along the edge, timing and kick. */
interface Drop {
  /** 0 lead glob, 1 mid drop, 2 speck. */
  kind: 0 | 1 | 2
  /** 0..1 along the far edge (lo..hi). */
  f: number
  r: number
  /** Release time (s after open starts). */
  tr: number
  speed: number
  /** Angle off the open direction (rad, + toward hi). */
  a: number
  life: number
  neck: number
}

function burst(b: EmergeBridge, strength: number, preset: GoopPreset, seed: number, fx: EmergeDripOptions, origin: number): Drop[] {
  const D = EMERGE_MOMENTUM.drips
  const P = EMERGE_MOMENTUM.preset[preset]
  const G = GOOP_PHYSICS
  const amount = emergeDripKnob('openDripAmount', fx.openDripAmount)
  const size = emergeDripKnob('openDripSize', fx.openDripSize)
  const fling = emergeDripKnob('openDripFling', fx.openDripFling)
  const v = emergeDripKnob('openDripVariety', fx.openDripVariety)
  const n = emergeDripCount(b.breadth, strength, preset, amount)
  if (n === 0) return []
  // Seeded +-1 jitter scaled by the variety (0: every drop alike), like the button's hits.
  const rv = (i: number, k: number): number => (rand(seed, i, k) * 2 - 1) * v
  // Size classes (the button's hit spray): variety 0 flattens them toward a mid drop.
  const tier = v
  const cls = (x: number): number => 1 + (x - 1) * tier
  const sizes = [cls(G.eruptLeadSize / G.eruptMidSize), 1, cls(G.eruptSpeckSize / G.eruptMidSize)]
  const speeds = [cls(G.eruptLeadSpeed / G.eruptMidSpeed), 1, cls(G.eruptSpeckSpeed / G.eruptMidSpeed)]
  const leads = clamp(Math.round(n * D.leads), 1, EMERGE_MOMENTUM_NECKS)
  const mids = Math.round(n * D.mids)
  // Even slots over the whole edge, dealt out in a seeded order so classes interleave.
  const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => rand(seed, p, 7) - rand(seed, q, 7))
  const unit = b.bulb * D.unit * G.eruptMidSize * P.dripSize * size
  const launch = D.launch * P.launch * fling * (0.6 + 0.4 * strength)
  const out: Drop[] = []
  for (let i = 0; i < n; i++) {
    const kind: Drop['kind'] = i < leads ? 0 : i < leads + mids ? 1 : 2
    const f = clamp((order[i]! + 0.5 + rv(i, 3) * 0.45) / n)
    const r = Math.max(D.minPx * Math.min(1, size), unit * sizes[kind]! * (1 + rv(i, 1) * 0.2))
    const dist = Math.abs(f - origin) / Math.max(origin, 1 - origin, 0.5)
    const tr = D.start + D.ripple * dist + Math.abs(rv(i, 2)) * D.jitter
    const speed = launch * speeds[kind]! * (1 + rv(i, 4) * 0.25)
    const a = (f - 0.5) * D.fan + rv(i, 5) * D.cone[kind]!
    const life = D.life[kind]! * (1 + rv(i, 6) * 0.15)
    const neck = kind === 0 ? D.swell * (1 + rv(i, 8) * 0.3) : kind === 1 ? D.swell * 0.5 : 0
    out.push({ kind, f, r, tr, speed, a, life, neck })
  }
  return out
}

function drips(
  b: EmergeBridge,
  sec: number,
  strength: number,
  preset: GoopPreset,
  ctx: EmergeMomentumContext,
  fx: EmergeDripOptions,
  now: Span | null,
  out: EmergeCircle[],
): void {
  if (strength <= 0) return
  const D = EMERGE_MOMENTUM.drips
  const seed = ctx.seed ?? 0
  // The ripple starts across from where the bridge meets the panel (panel-local cross runs
  // 0..breadth at rest, so this stays put while the panel inflates).
  const origin = b.breadth > 0 ? clamp(b.targetCross / b.breadth) : 0.5
  const drops = burst(b, strength, preset, seed, fx, origin)
  if (drops.length === 0) return
  const memo = new Map<number, Span | null>()
  const spanAt = (t: number): Span | null => {
    if (!ctx.bodyAt) return now
    const k = Math.round(t * 2000)
    if (!memo.has(k)) memo.set(k, spanOf(ctx.bodyAt(k / 2000), b))
    return memo.get(k)!
  }
  const crossOf = (s: Span, f: number, r: number): number => {
    const m = Math.min(r * 0.6, (s.hi - s.lo) / 2)
    return lerp(s.lo + m, s.hi - m, f)
  }

  // Ripple: two bumps run out from the origin to both ends of the far edge.
  const tauR = sec - D.start
  if (now && tauR > 0 && tauR < D.ripple * 1.3) {
    const u = tauR / (D.ripple * 1.3)
    const env = Math.sin(Math.PI * u) * Math.min(1.4, 0.6 + 0.4 * strength)
    const R = b.bulb * D.rippleSize * emergeDripKnob('openDripSize', fx.openDripSize) ** 0.5
    const len = now.hi - now.lo
    const o = now.lo + origin * len
    const reach = (tauR / D.ripple) * Math.max(o - now.lo, now.hi - o)
    const fronts = [
      { at: o - reach, trail: o - reach * 0.6, lim: now.lo },
      { at: o + reach, trail: o + reach * 0.6, lim: now.hi },
    ]
    fronts.forEach((fr, j) => {
      const put = (c: number, k: number, idx: number): void => {
        const inside = j === 0 ? c >= fr.lim : c <= fr.lim
        const r = R * k * env
        if (!inside || r < 0.5) return
        const p = toLocal(b, now.far + r * (D.ripplePush - 1), c)
        out[RIPPLE_AT + idx] = { x: p.x, y: p.y, r }
      }
      put(fr.at, 1, j * 2)
      put(fr.trail, 0.65, j * 2 + 1)
    })
  }

  let necks = 0
  drops.forEach((d, i) => {
    const neckSlot = d.kind === 0 && necks < EMERGE_MOMENTUM_NECKS ? NECK_AT + necks++ : -1
    const at = DRIP_AT + i
    const tau = sec - d.tr
    if (tau < -d.neck || tau >= d.life) return
    if (tau < 0) {
      // Necking: the glob swells out of the far edge on a fat neck that pinches at the end.
      if (!now) return
      const q = 1 + tau / d.neck
      const c = crossOf(now, d.f, d.r)
      const head = now.far + d.r * (-0.6 + 1.5 * smooth(q))
      const hp = toLocal(b, head, c)
      out[at] = { x: hp.x, y: hp.y, r: d.r * (0.5 + 0.5 * smooth(q)) }
      if (neckSlot >= 0) {
        const np = toLocal(b, lerp(now.far, head, 0.45), c)
        out[neckSlot] = { x: np.x, y: np.y, r: d.r * 0.7 * (1 - smooth((q - 0.65) / 0.35) * 0.6) }
      }
      return
    }
    // Let go: carry some of the far edge's speed plus the kick, bleed it off, fall, shrink.
    const atBreak = spanAt(d.tr)
    if (!atBreak) return
    const before = spanAt(d.tr - 0.016)
    const vEdge = before ? clamp((atBreak.far - before.far) / 0.016, 0, 600) : 0
    const vMain = vEdge * D.carry + d.speed * Math.cos(d.a)
    const vCross = d.speed * Math.sin(d.a)
    const k = (1 - Math.exp(-D.drag * tau)) / D.drag
    const start = d.neck > 0 ? d.r * 0.9 : d.r * 0.2
    const p = toLocal(b, atBreak.far + start + vMain * k, crossOf(atBreak, d.f, d.r) + vCross * k)
    const g = 0.5 * D.gravity * tau * tau
    const life = tau / d.life
    // Specks (no neck) pop out of the edge over the first few frames.
    const grow = d.neck > 0 ? 1 : 0.4 + 0.6 * smooth(tau / 0.04)
    const rr = d.r * grow * (1 - 0.12 * smooth(life / 0.3)) * (1 - smooth((life - (1 - D.fade)) / D.fade))
    out[at] = { x: p.x, y: p.y + g, r: life >= 0.995 ? 0 : rr }
    // The snapped neck stub recoils into the far edge.
    const kk = clamp(tau / 0.08)
    if (now && neckSlot >= 0 && kk < 1) {
      const sp = toLocal(b, now.far + d.r * 0.3 * (1 - kk), crossOf(now, d.f, d.r))
      out[neckSlot] = { x: sp.x, y: sp.y, r: d.r * 0.4 * (1 - smooth(kk)) }
    }
  })
}

// ---- bloom (radial) -------------------------------------------------------------------------

/** Panel-local box of a body. */
interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}
const boxOf = (body: EmergeBody): Box | null =>
  body.w <= 0 || body.h <= 0
    ? null
    : { x0: body.cx - body.w / 2, y0: body.cy - body.h / 2, x1: body.cx + body.w / 2, y1: body.cy + body.h / 2 }

/** Edge normals' angles (screen space, y down): top, right, bottom, left. */
const EDGE_ANGLE = [-Math.PI / 2, 0, Math.PI / 2, Math.PI] as const

/** Point at `f` (0..1) around the box's perimeter (top L->R, right T->B, bottom R->L, left
 *  B->T), kept `inset` px from the corners, and its outward angle (fanned toward corners). */
function perimeterAt(bx: Box, f: number, inset: number, fan: number): { x: number; y: number; a: number } {
  const w = bx.x1 - bx.x0
  const h = bx.y1 - bx.y0
  const P = 2 * (w + h)
  let d = (((f % 1) + 1) % 1) * P
  const lens = [w, h, w, h]
  let e = 0
  while (e < 3 && d > lens[e]!) d -= lens[e++]!
  const len = lens[e]!
  const u = len > 0 ? clamp(d / len) : 0.5
  const m = Math.min(inset, len / 2)
  const at = lerp(m, len - m, u)
  const a = EDGE_ANGLE[e]! + (u - 0.5) * fan
  switch (e) {
    case 0:
      return { x: bx.x0 + at, y: bx.y0, a }
    case 1:
      return { x: bx.x1, y: bx.y0 + at, a }
    case 2:
      return { x: bx.x1 - at, y: bx.y1, a }
    default:
      return { x: bx.x0, y: bx.y1 - at, a }
  }
}

/** Distance (px) from a point to a rect (0 inside). */
function rectDist(x: number, y: number, r: EmergeRect): number {
  return Math.hypot(Math.max(r.x - x, 0, x - r.x - r.width), Math.max(r.y - y, 0, y - r.y - r.height))
}

/**
 * Bloom: `c` slid along `b.dir` (away from the trigger, into the panel) just far enough that
 * it keeps `clear` px off the trigger (`b.anchorRect`). Unchanged when it is already clear.
 */
export function emergeKeepOff(c: EmergeCircle, b: Pick<EmergeBridge, 'dir' | 'anchorRect'>, clear = 1.5): EmergeCircle {
  const a = b.anchorRect
  if (!a || c.r <= 0 || rectDist(c.x, c.y, a) >= c.r + clear) return c
  let lo = 0
  let hi = c.r * 2 + clear + Math.max(a.width, a.height)
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2
    if (rectDist(c.x + b.dir.x * m, c.y + b.dir.y * m, a) >= c.r + clear) hi = m
    else lo = m
  }
  return { x: c.x + b.dir.x * hi, y: c.y + b.dir.y * hi, r: c.r }
}

/** Distance (px) from a point to a box (0 inside). */
function boxDist(x: number, y: number, k: Box): number {
  return Math.hypot(Math.max(k.x0 - x, 0, x - k.x1), Math.max(k.y0 - y, 0, y - k.y1))
}

/** Most flight samples checked against the trigger, per candidate launch. */
const PATH_MAX_SAMPLES = 160

/**
 * A splash drop's launch that keeps it (radius `r`, leaving `off` x r out of the edge; all of
 * its swell and flight) out of the
 * keep-out box `keep`: as is; else deflected away from the trigger, then also slowed; else
 * moved to the mirrored spot on the opposite edge. null: no clear path (the drop is skipped).
 */
function clearOfTrigger(
  keep: Box,
  edge: Box,
  f: number,
  r: number,
  off: number,
  da: number,
  speed: number,
  lifeT: number,
  fan: number,
  coin: number,
): { f: number; rot: number; slow: number } | null {
  const D = EMERGE_MOMENTUM.drips
  const B = EMERGE_MOMENTUM.bloom
  const kx = (keep.x0 + keep.x1) / 2
  const ky = (keep.y0 + keep.y1) / 2
  for (const ff of [f, f + 0.5]) {
    const e = perimeterAt(edge, ff, r * 0.8, fan)
    // The swell pokes up to ~0.9r out of the edge at full size before it lets go.
    if (boxDist(e.x + Math.cos(e.a) * r * 0.9, e.y + Math.sin(e.a) * r * 0.9, keep) < r) continue
    if (boxDist(e.x, e.y, keep) < r) continue
    // Turn away from the trigger's center (a coin flip when it is dead ahead).
    const a0 = e.a + da
    const z = Math.cos(a0) * (ky - e.y) - Math.sin(a0) * (kx - e.x)
    const away = Math.abs(z) > 1e-6 ? -Math.sign(z) : coin < 0.5 ? -1 : 1
    for (const slow of B.slow) {
      for (const d of B.deflect) {
        const a = a0 + away * d
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        // Fine enough steps that the drop moves under half its radius between samples.
        const travel = speed * slow * (1 / D.drag) + 0.5 * D.gravity * lifeT * lifeT
        const steps = Math.min(PATH_MAX_SAMPLES, Math.max(8, Math.ceil(travel / Math.max(1, r * 0.5))))
        let ok = true
        for (let j = 0; j <= steps && ok; j++) {
          const tau = (lifeT * j) / steps
          const dist = r * off + speed * slow * ((1 - Math.exp(-D.drag * tau)) / D.drag)
          const x = e.x + ca * dist
          const y = e.y + sa * dist + 0.5 * D.gravity * tau * tau
          if (boxDist(x, y, keep) < r) ok = false
        }
        if (ok) return { f: ff, rot: away * d, slow }
      }
    }
  }
  return null
}

/** Number of splash drops for a bloomed panel of this size. */
export function emergeBloomDripCount(width: number, height: number, strength: number, preset: GoopPreset = 'playful', amount = 1): number {
  const B = EMERGE_MOMENTUM.bloom
  if (strength <= 0 || amount <= 0 || width <= 0 || height <= 0) return 0
  const k = clamp((width + height) / B.perimRef, B.perimScale[0], B.perimScale[1])
  return clamp(Math.round(B.preset[preset].drips * amount * k * (0.6 + 0.4 * strength)), 1, EMERGE_MOMENTUM_DRIPS)
}

function bloomMomentum(
  pose: EmergePose,
  b: EmergeBridge,
  phase: EmergePhase,
  sec: number,
  effects: EmergeMomentumEffects & EmergeDripOptions,
  ctx: EmergeMomentumContext,
  preset: GoopPreset,
  extra: EmergeCircle[],
): EmergePose {
  if (phase !== 'open') return { ...pose, circles: [...pose.circles, ...extra] }
  const B = EMERGE_MOMENTUM.bloom
  const S = EMERGE_MOMENTUM.slosh
  let body = pose.body
  const bx = boxOf(body)
  const strength = emergeMomentumStrength(effects.openSlosh)
  if (bx && strength > 0) {
    // Radial slosh: every edge kicks outward (slightly out of step), rebounds and wobbles.
    const size = Math.max(b.bulb, Math.min(b.width, b.height) * B.sloshRef)
    const nb = { ...bx }
    for (let e = 0; e < 4; e++) {
      const d = emergeSloshOffset(sec - B.lag[e]!, size, strength, preset)
      const horiz = e === 0 || e === 2
      const len = horiz ? bx.x1 - bx.x0 : bx.y1 - bx.y0
      const depth = horiz ? bx.y1 - bx.y0 : bx.x1 - bx.x0
      if (d < 0) {
        const k = Math.min(S.maxInward, -d * S.inward)
        if (e === 0) nb.y0 += k
        else if (e === 1) nb.x1 -= k
        else if (e === 2) nb.y1 -= k
        else nb.x0 += k
        continue
      }
      const r = Math.max(0, Math.min(len * S.width, len / 2.3, depth / 2, 80))
      const dk = Math.min(d, r)
      if (r < 1 || dk < 0.5) continue
      const back = r - dk
      const mx = (bx.x0 + bx.x1) / 2
      const my = (bx.y0 + bx.y1) / 2
      // The edge facing the trigger only bulges into the gap, never over the trigger.
      extra[e] = emergeKeepOff(
        e === 0
          ? { x: mx, y: bx.y0 + back, r }
          : e === 1
            ? { x: bx.x1 - back, y: my, r }
            : e === 2
              ? { x: mx, y: bx.y1 - back, r }
              : { x: bx.x0 + back, y: my, r },
        b,
      )
    }
    if (nb.x0 !== bx.x0 || nb.x1 !== bx.x1 || nb.y0 !== bx.y0 || nb.y1 !== bx.y1) {
      body = { cx: (nb.x0 + nb.x1) / 2, cy: (nb.y0 + nb.y1) / 2, w: nb.x1 - nb.x0, h: nb.y1 - nb.y0 }
    }
  }
  bloomSplash(b, sec, emergeMomentumStrength(effects.openDrips), preset, ctx, effects, bx, extra)
  return { body, circles: [...pose.circles, ...extra], content: pose.content }
}

/** The all-around splash: drops of every class tear off the whole perimeter at once. */
function bloomSplash(
  b: EmergeBridge,
  sec: number,
  strength: number,
  preset: GoopPreset,
  ctx: EmergeMomentumContext,
  fx: EmergeDripOptions,
  now: Box | null,
  out: EmergeCircle[],
): void {
  if (strength <= 0) return
  const D = EMERGE_MOMENTUM.drips
  const B = EMERGE_MOMENTUM.bloom
  const BP = B.preset[preset]
  const P = EMERGE_MOMENTUM.preset[preset]
  const G = GOOP_PHYSICS
  const seed = ctx.seed ?? 0
  const amount = emergeDripKnob('openDripAmount', fx.openDripAmount)
  const size = emergeDripKnob('openDripSize', fx.openDripSize)
  const fling = emergeDripKnob('openDripFling', fx.openDripFling)
  const v = emergeDripKnob('openDripVariety', fx.openDripVariety)
  const n = emergeBloomDripCount(b.width, b.height, strength, preset, amount)
  if (n === 0) return
  const rv = (i: number, k: number): number => (rand(seed, i, k) * 2 - 1) * v
  const cls = (x: number): number => 1 + (x - 1) * v
  const sizes = [cls(G.eruptLeadSize / G.eruptMidSize), 1, cls(G.eruptSpeckSize / G.eruptMidSize)]
  const speeds = [cls(G.eruptLeadSpeed / G.eruptMidSpeed), 1, cls(G.eruptSpeckSpeed / G.eruptMidSpeed)]
  const leads = clamp(Math.round(n * D.leads * 1.3), 1, EMERGE_MOMENTUM_NECKS)
  const mids = Math.round(n * D.mids)
  const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => rand(seed, p, 7) - rand(seed, q, 7))
  const unit = b.bulb * D.unit * G.eruptMidSize * P.dripSize * BP.size * size
  const launch = D.launch * BP.launch * fling * (0.6 + 0.4 * strength)
  const rest: Box = { x0: 0, y0: 0, x1: b.width, y1: b.height }
  const spanAt = (t: number): Box => (ctx.bodyAt ? (boxOf(ctx.bodyAt(t)) ?? rest) : (now ?? rest))
  const ar = b.anchorRect
  const keep: Box | null =
    ar && ar.width > 0 && ar.height > 0
      ? { x0: ar.x - B.keepOut, y0: ar.y - B.keepOut, x1: ar.x + ar.width + B.keepOut, y1: ar.y + ar.height + B.keepOut }
      : null
  let necks = 0
  for (let i = 0; i < n; i++) {
    const kind = i < leads ? 0 : i < leads + mids ? 1 : 2
    let f = (order[i]! + 0.5 + rv(i, 3) * 0.45) / n
    const r = Math.max(D.minPx * Math.min(1, size), unit * sizes[kind]! * (1 + rv(i, 1) * 0.2))
    const tr = D.start + Math.abs(rv(i, 2)) * B.spread
    const speed = launch * speeds[kind]! * (1 + rv(i, 4) * 0.3)
    const da = rv(i, 5) * D.cone[kind]!
    const lifeT = D.life[kind]! * (1 + rv(i, 6) * 0.15)
    const neck = kind === 0 ? D.swell * (1 + rv(i, 8) * 0.3) : kind === 1 ? D.swell * 0.5 : 0
    const neckSlot = kind === 0 && necks < EMERGE_MOMENTUM_NECKS ? NECK_AT + necks++ : -1
    const at = DRIP_AT + i
    const tau = sec - tr
    if (tau < -neck || tau >= lifeT) continue
    // Keep the whole flight (and the swell before it) off the trigger: deterministic per drop
    // (it only depends on the release-time edge), so it doesn't flicker frame to frame.
    let rot = 0
    let slow = 1
    if (keep) {
      const fit = clearOfTrigger(keep, spanAt(tr), f, r, neck > 0 ? 0.9 : 0.2, da, speed, lifeT, B.fan, rand(seed, i, 9))
      if (!fit) continue
      ;({ f, rot, slow } = fit)
    }
    if (tau < 0) {
      if (!now) continue
      const q = 1 + tau / neck
      const e = perimeterAt(now, f, r * 0.8, B.fan)
      const a = e.a + da * 0.3 + rot
      const head = r * (-0.6 + 1.5 * smooth(q))
      out[at] = { x: e.x + Math.cos(a) * head, y: e.y + Math.sin(a) * head, r: r * (0.5 + 0.5 * smooth(q)) }
      if (neckSlot >= 0) {
        const nk = head * 0.45
        out[neckSlot] = { x: e.x + Math.cos(a) * nk, y: e.y + Math.sin(a) * nk, r: r * 0.7 * (1 - smooth((q - 0.65) / 0.35) * 0.6) }
      }
      continue
    }
    const e = perimeterAt(spanAt(tr), f, r * 0.8, B.fan)
    const a = e.a + da + rot
    const k = (1 - Math.exp(-D.drag * tau)) / D.drag
    const dist = (neck > 0 ? r * 0.9 : r * 0.2) + speed * slow * k
    const g = 0.5 * D.gravity * tau * tau
    const life = tau / lifeT
    const grow = neck > 0 ? 1 : 0.4 + 0.6 * smooth(tau / 0.04)
    const rr = r * grow * (1 - 0.12 * smooth(life / 0.3)) * (1 - smooth((life - (1 - D.fade)) / D.fade))
    out[at] = { x: e.x + Math.cos(a) * dist, y: e.y + Math.sin(a) * dist + g, r: life >= 0.995 ? 0 : rr }
    const kk = clamp(tau / 0.08)
    if (now && neckSlot >= 0 && kk < 1) {
      const sp = perimeterAt(now, f, r * 0.8, B.fan)
      out[neckSlot] = { x: sp.x + Math.cos(sp.a) * r * 0.3 * (1 - kk), y: sp.y + Math.sin(sp.a) * r * 0.3 * (1 - kk), r: r * 0.4 * (1 - smooth(kk)) }
    }
  }
}

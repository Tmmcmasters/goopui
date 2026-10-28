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
import type { EmergeBody, EmergeBridge, EmergeCircle, EmergePhase, EmergePose } from './emerge'

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
})

/** Most drops one burst sheds (one circle each); the first EMERGE_MOMENTUM_NECKS lead globs
 *  also get a neck circle. */
export const EMERGE_MOMENTUM_DRIPS = 32
export const EMERGE_MOMENTUM_NECKS = 4
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
    const c = clamp(cross + p.dc * R, s.lo + r * 0.5, s.hi - r * 0.5)
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

// Emerge momentum: the goo keeps moving after the panel lands.
//
// Open slosh: the panel's mass carries past its resting shape, so the FAR edge (facing away
// from the anchor) bulges out, rebounds and wobbles a few times before settling.
// Open drips: a few fat drops neck off the far edge as the panel launches, break off, fly on
// a little in the open direction, then fall (screen-down gravity) and shrink away.
// Close slosh: on the suck-back the goo lags; the far edge trails and the NEAR edge sloshes
// against the anchor.
//
// Pure: `emergeMomentum` decorates an `emergePose` with these, given the seconds since the
// phase started (speed-scaled). It appends a fixed EMERGE_MOMENTUM_CIRCLES circles (zero
// radius when unused) and nudges the body's near/far edges. Only types come from ./emerge,
// so the two modules don't form a runtime cycle.

import type { GoopPreset } from './constants'
import type { EmergeBody, EmergeBridge, EmergeCircle, EmergePhase, EmergePose } from './emerge'

/** Effect toggles: `true` (1) / `false` (0), or a 0..2 strength multiplier. Default true. */
export interface EmergeMomentumEffects {
  /** Far edge bulges past rest, rebounds and wobbles after the open. */
  openSlosh?: boolean | number
  /** Drops neck off the far edge on open, fly on, then fall and fade. */
  openDrips?: boolean | number
  /** Goo lags on close; the near edge sloshes against the anchor. */
  closeSlosh?: boolean | number
}

/** Tuning. Times in seconds (at speed 1), lengths in bulb radii unless noted. */
export const EMERGE_MOMENTUM = Object.freeze({
  /** Per-preset scale: slosh amplitude, drip count, drip size, drip launch. */
  preset: Object.freeze({
    subtle: Object.freeze({ slosh: 0.55, drips: 2, dripSize: 0.85, launch: 0.7 }),
    playful: Object.freeze({ slosh: 1, drips: 3, dripSize: 1, launch: 1 }),
    wild: Object.freeze({ slosh: 1.6, drips: 4, dripSize: 1.2, launch: 1.4 }),
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
    /** First drip starts necking (s after open starts); later ones are staggered. */
    start: 0.04,
    stagger: 0.04,
    /** Necking time before the drop lets go. */
    swell: 0.13,
    /** Flight + fall + fade time after letting go. */
    life: 0.6,
    /** Drop radius range, bulb radii (seeded per drop). */
    size: Object.freeze([0.42, 0.72] as const),
    /** Launch speed along the open direction (px/s) on top of the far edge's own speed, and
     *  the drag that bleeds it off (1/s). */
    launch: 240,
    drag: 5,
    /** Screen-down gravity (px/s^2). */
    gravity: 1100,
    /** Fraction of the far edge's breadth the drops spread across. */
    spread: 0.7,
    /** Shrink to nothing over the last fraction of `life`. */
    fade: 0.55,
  }),
})

/** Most drops any preset sheds; each is a head + one neck circle. */
export const EMERGE_MOMENTUM_DRIPS = 4
const BULGE_CIRCLES = 3
/** Circles `emergeMomentum` appends: bulge + drips. Always this many (zero radius when idle). */
export const EMERGE_MOMENTUM_CIRCLES = BULGE_CIRCLES + EMERGE_MOMENTUM_DRIPS * 2

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
  const drips = d.start + d.stagger * 1.4 * (EMERGE_MOMENTUM_DRIPS - 1) + d.swell + d.life
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
  effects: EmergeMomentumEffects = {},
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
  if (phase === 'open') drips(b, sec, emergeMomentumStrength(effects.openDrips), preset, ctx, span, extra)
  return { body, circles: [...pose.circles, ...extra], content: pose.content }
}

function drips(
  b: EmergeBridge,
  sec: number,
  strength: number,
  preset: GoopPreset,
  ctx: EmergeMomentumContext,
  now: Span | null,
  out: EmergeCircle[],
): void {
  if (strength <= 0) return
  const D = EMERGE_MOMENTUM.drips
  const P = EMERGE_MOMENTUM.preset[preset]
  const seed = ctx.seed ?? 0
  // 2..4 drops: the preset's count, +-1 by seed, within the budget.
  const jitter = Math.floor(rand(seed, 9, 9) * 3) - 1
  const count = clamp(P.drips + jitter, 2, EMERGE_MOMENTUM_DRIPS)
  const spanAt = (t: number): Span | null => (ctx.bodyAt ? spanOf(ctx.bodyAt(t), b) : now)
  for (let i = 0; i < count; i++) {
    const at = BULGE_CIRCLES + i * 2
    const u = rand(seed, i, 1)
    const s0 = D.start + D.stagger * i * (0.6 + 0.8 * rand(seed, i, 2))
    const tau = sec - s0
    if (tau <= 0 || tau >= D.swell + D.life) continue
    const r = b.bulb * lerp(D.size[0], D.size[1], u) * P.dripSize * (0.7 + 0.3 * strength)
    // Spread evenly across the edge, nudged by the seed.
    const f = (i + 0.5 + (rand(seed, i, 3) - 0.5) * 0.6) / count
    const crossOf = (s: Span): number => clamp(lerp(s.lo, s.hi, 0.5 + (f - 0.5) * D.spread), s.lo + r, Math.max(s.lo + r, s.hi - r))
    if (tau < D.swell) {
      // Necking: the drop swells out of the far edge on a fat neck that pinches at the end.
      if (!now) continue
      const q = tau / D.swell
      const c = crossOf(now)
      const head = now.far + r * (-0.6 + 1.7 * smooth(q))
      const hp = toLocal(b, head, c)
      out[at] = { x: hp.x, y: hp.y, r: r * (0.55 + 0.45 * smooth(q)) }
      const np = toLocal(b, lerp(now.far, head, 0.45), c)
      out[at + 1] = { x: np.x, y: np.y, r: r * 0.72 * (1 - smooth((q - 0.65) / 0.35) * 0.6) }
      continue
    }
    // Let go: carry the far edge's own speed plus a kick, bleed it off, fall, shrink away.
    const sb = s0 + D.swell
    const atBreak = spanAt(sb)
    if (!atBreak) continue
    const before = spanAt(sb - 0.016)
    const vEdge = before ? clamp((atBreak.far - before.far) / 0.016, 0, 600) : 0
    const v0 = vEdge + D.launch * P.launch * strength * (0.75 + 0.5 * rand(seed, i, 4))
    const tf = tau - D.swell
    const travel = (v0 * (1 - Math.exp(-D.drag * tf))) / D.drag
    const c = crossOf(atBreak)
    const p0 = toLocal(b, atBreak.far + r * 1.1 + travel, c + (rand(seed, i, 5) - 0.5) * 60 * tf)
    const g = 0.5 * D.gravity * tf * tf
    const life = tf / D.life
    const rr = r * (1 - 0.12 * smooth(life / 0.3)) * (1 - smooth((life - (1 - D.fade)) / D.fade))
    out[at] = { x: p0.x, y: p0.y + g, r: life >= 0.995 ? 0 : rr }
    // The snapped neck stub recoils into the far edge.
    const k = clamp(tf / 0.08)
    if (now && k < 1) {
      const sp = toLocal(b, now.far + r * 0.3 * (1 - k), crossOf(now))
      out[at + 1] = { x: sp.x, y: sp.y, r: r * 0.4 * (1 - smooth(k)) }
    }
  }
}

// Liquid helpers shared by the goo components (switch, spinner, slider, progress).
//
// Pure math, no DOM:
//   - `decayWobble`: the damped jelly wobble that eases to exactly zero (switch splat landing,
//     slider release wobble and landing splat).
//   - `hangingDrip`: a drop swelling out of a body on a neck that pinches and lets go (spinner
//     drips, progress drips).
//   - `stepSlosh` / `sloshSettled`: a forced damped spring for a liquid surface. Accelerating
//     the container piles the liquid up toward one end; when the push stops it sloshes back
//     and forth and settles. A travelling wave phase runs along the surface meanwhile.
//   - `liquidBar`: a bar of liquid as a fixed number of overlapping ellipses whose surface
//     rises and falls with the slosh and the wave. The goo filter melts them into one body.

import { stepSpring, springConfig, type SpringConfig } from './spring'

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))
const smooth = (x: number): number => {
  const t = clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}

/** One goo circle. sx/sy stretch it along x / y (1 = round). */
export interface LiquidCircle {
  x: number
  y: number
  r: number
  sx: number
  sy: number
}

/**
 * Damped wobble `a` seconds after a kick: sin(2πf·a)·e^(-damping·a), eased to exactly 0 at
 * `settle` (and 0 before the kick). The first half-cycle is the hit itself; `after` scales
 * every swing after it (0 = one squash and no wobble, 1 = full wobble).
 */
export function decayWobble(a: number, freq: number, damping: number, settle: number, after = 1): number {
  if (!(a > 0) || a >= settle) return 0
  const ph = 2 * Math.PI * freq * a
  const g = Math.sin(ph) * Math.exp(-damping * a) * (1 - a / settle)
  return ph < Math.PI ? g : g * after
}

/**
 * A drop hanging off a body at progress `u` (0..1) of its swell: it grows out of the anchor
 * (center ax/ay, radius `anchorR`), stretches away along (dx, dy) (unit vector, default
 * screen-down) on a lengthening neck that pinches to nothing at u = 1, when it lets go.
 * Returns [drop, ...neck] (`necks` neck circles). Radius `rd` is the full-grown drop.
 */
export function hangingDrip(
  u: number,
  ax: number,
  ay: number,
  anchorR: number,
  rd: number,
  necks: number,
  dx = 0,
  dy = 1,
): { x: number; y: number; r: number }[] {
  const s = smooth(u)
  const off = (0.5 * anchorR + 0.7 * rd) * s + 0.9 * rd * smooth((u - 0.45) / 0.55)
  const out = [{ x: ax + dx * off, y: ay + dy * off, r: rd * (0.4 + 0.6 * s) }]
  const neckR = rd * (0.7 - 0.35 * smooth((u - 0.4) / 0.4)) * (1 - smooth((u - 0.82) / 0.18))
  for (let k = 1; k <= necks; k++) {
    const f = k / (necks + 1)
    out.push({ x: ax + dx * off * f, y: ay + dy * off * f, r: neckR })
  }
  return out
}

/** Slosh state: surface pile-up `x` (+ toward the bar's far end, about -1..1), its velocity,
 *  and the travelling wave's phase (rad). */
export interface SloshState {
  x: number
  v: number
  phase: number
}

/** Slosh tuning (per preset scale lives with each component). */
export const LIQUID_SLOSH = Object.freeze({
  /** Spring feel of the surface: response (s) and damping ratio. Low ratio = several sloshes. */
  response: 0.5,
  dampingRatio: 0.22,
  /** Pile-up per px/s² of container acceleration. */
  gain: 1 / 2600,
  /** Largest pile-up (either way). */
  max: 1,
  /** Wave speed (rad/s) and how much of the pile (and its speed) feeds the wave. */
  waveSpeed: 11,
  waveFromPile: 0.35,
  waveFromSpeed: 0.08,
})

export const createSlosh = (): SloshState => ({ x: 0, v: 0, phase: 0 })

/** The slosh spring config (unit pile-up, seconds). */
export const sloshConfig = (response = LIQUID_SLOSH.response, dampingRatio = LIQUID_SLOSH.dampingRatio): SpringConfig =>
  springConfig({ response, dampingRatio })

/**
 * Advance the slosh by `dt` s while the container accelerates at `accel` (px/s², signed along
 * the bar; + toward its far end). The surface piles toward the acceleration, sloshes back when
 * it stops, and decays to rest. Closed-form spring, so frame-rate independent. Mutates `s`.
 */
export function stepSlosh(s: SloshState, accel: number, dt: number, cfg: SpringConfig = sloshConfig(), gain = LIQUID_SLOSH.gain): void {
  if (!(dt > 0)) return
  const target = clamp(accel * gain, -LIQUID_SLOSH.max, LIQUID_SLOSH.max)
  stepSpring(s, target, cfg, dt)
  s.x = clamp(s.x, -1.5, 1.5)
  s.phase = (s.phase + dt * LIQUID_SLOSH.waveSpeed) % (Math.PI * 200)
}

/** True when the surface is (visually) still. */
export const sloshSettled = (s: SloshState, eps = 0.004): boolean => Math.abs(s.x) < eps && Math.abs(s.v) < eps * 10

/** Wave amplitude (fraction of the bar's half-thickness) the slosh feeds. */
export const sloshWave = (s: SloshState): number =>
  Math.min(0.7, LIQUID_SLOSH.waveFromPile * Math.abs(s.x) + LIQUID_SLOSH.waveFromSpeed * Math.abs(s.v))

export interface LiquidBarOptions {
  /** Ends along the main axis (host px). Either order. */
  a: number
  b: number
  /** Center line on the cross axis (host px). */
  cross: number
  /** Half thickness (px). */
  r: number
  /** Main axis is y (vertical bar) instead of x. */
  vertical?: boolean
  /** Which cross side is the free surface: -1 the low side (top of a horizontal bar),
   *  1 the high side, 0 both (the bar swells symmetrically). Default -1. */
  surface?: -1 | 0 | 1
  /** Pile-up: > 0 heaps toward `b`, < 0 toward `a` (about -1..1). */
  pile?: number
  /** How tall a full pile-up is (multiples of r). Default 1. */
  pileAmp?: number
  /** Travelling wave amplitude (fraction of r) and phase (rad). */
  wave?: number
  phase?: number
  /** Wavelength (px). Default 8r. */
  waveLength?: number
  /** Ellipses in the bar (fixed so renderers keep one blob each). */
  segments: number
}

/**
 * A liquid bar from `a` to `b`: `segments` overlapping ellipses with rounded ends whose free
 * surface rises with the pile-up and the travelling wave. Shorter than its thickness it
 * shrinks to a dot; zero length (or r) is all zero-radius circles. Pure.
 */
export function liquidBar(o: LiquidBarOptions): LiquidCircle[] {
  const n = Math.max(1, Math.floor(o.segments))
  const lo = Math.min(o.a, o.b)
  const hi = Math.max(o.a, o.b)
  const L = hi - lo
  const flip = o.b < o.a
  const vertical = !!o.vertical
  const surface = o.surface ?? -1
  const pile = (flip ? -1 : 1) * (o.pile ?? 0)
  const pileAmp = o.pileAmp ?? 1
  const wave = o.wave ?? 0
  const phase = o.phase ?? 0
  const lambda = Math.max(1, o.waveLength ?? o.r * 8)
  const out: LiquidCircle[] = []
  const at = (main: number, cross: number, r: number, sMain: number, sCross: number): LiquidCircle =>
    vertical ? { x: cross, y: main, r, sx: sCross, sy: sMain } : { x: main, y: cross, r, sx: sMain, sy: sCross }
  if (!(L > 0.01) || !(o.r > 0.01)) {
    for (let i = 0; i < n; i++) out.push(at(lo, o.cross, 0, 1, 1))
    return out
  }
  // Short bar: a dot that grows with the length.
  const r = Math.min(o.r, L / 2)
  // Half-length of each ellipse along the bar: 1.5x the spacing, so neighbours overlap deeply
  // (at the midpoint between two centres each is still ~94% tall: a flat surface, no
  // dashes even when the goo blur is a pixel), and the end ellipses touch the ends exactly.
  const h = n === 1 ? L / 2 : Math.max(r, (1.5 * L) / (n + 2))
  const span = Math.max(0, L - 2 * h)
  for (let i = 0; i < n; i++) {
    const c = n === 1 ? lo + L / 2 : lo + h + (span * i) / (n - 1)
    const f = (c - lo) / L
    // Pile-up heaps toward one end (quadratic, so it reads as liquid piling against a wall).
    const heap = pile >= 0 ? pile * (1.5 * f * f - 0.5) : -pile * (1.5 * (1 - f) * (1 - f) - 0.5)
    const w = wave * Math.sin((2 * Math.PI * (c - lo)) / lambda - phase)
    // Ends taper so the surface wave doesn't bulge the rounded caps.
    const taper = smooth(Math.min(f, 1 - f) / 0.12)
    const bump = clamp(r * (heap * pileAmp + w) * taper, -0.5 * r, 1.3 * r)
    const rr = r + (surface === 0 ? bump : bump / 2)
    const cross = o.cross + (surface === 0 ? 0 : (surface * bump) / 2)
    out.push(at(c, cross, rr, h / rr, 1))
  }
  return out
}

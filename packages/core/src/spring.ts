// Tiny physics integrators. Pure math, no DOM.
//
// Frame-rate independence: both integrators use closed-form solutions, so the state after
// T seconds is the same whether it was reached in 30, 60, or 144 fps steps (targets are
// held constant within a frame).

import { GOOP_PHYSICS, type SpringFeel } from './constants'

export interface SpringConfig {
  /** k in a = k * (target - x) - c * v (unit mass). */
  stiffness: number
  /** c in a = k * (target - x) - c * v (unit mass). */
  damping: number
}

export interface SpringState {
  x: number
  v: number
}

/** Convert a designer-friendly feel ({ response, dampingRatio }) into stiffness/damping. */
export function springConfig(feel: SpringFeel, viscosity = 1): SpringConfig {
  // Viscosity stretches the response (slower) and pushes damping toward/over critical.
  const response = Math.max(0.01, feel.response * Math.sqrt(viscosity))
  const ratio = feel.dampingRatio * Math.pow(viscosity, 0.6)
  const w = (2 * Math.PI) / response
  return { stiffness: w * w, damping: 2 * ratio * w }
}

/** Clamp a frame delta (seconds) to [0, maxDt]. */
export function clampDt(dt: number, maxDt: number = GOOP_PHYSICS.maxDt): number {
  if (!Number.isFinite(dt) || dt < 0) return 0
  return dt > maxDt ? maxDt : dt
}

/**
 * Advance a damped spring toward `target` by dt seconds (mutates `s`).
 * Closed-form solution of x'' = -k (x - target) - c x' (unit mass), so the result is exact
 * for any dt: one 33 ms step lands exactly where four 8.3 ms steps do.
 */
export function stepSpring(s: SpringState, target: number, cfg: SpringConfig, dt: number): void {
  if (!(dt > 0)) return
  const w0 = Math.sqrt(Math.max(0, cfg.stiffness))
  const y0 = s.x - target
  const v0 = s.v
  if (w0 === 0) {
    // No spring force: pure exponential damping.
    const c = cfg.damping
    if (c > 0) {
      const e = Math.exp(-c * dt)
      s.x += (v0 * (1 - e)) / c
      s.v = v0 * e
    } else s.x += v0 * dt
    return
  }
  const zeta = cfg.damping / (2 * w0)
  let y: number
  let v: number
  if (Math.abs(zeta - 1) < 1e-4) {
    const e = Math.exp(-w0 * dt)
    const b = v0 + w0 * y0
    y = (y0 + b * dt) * e
    v = (v0 - w0 * b * dt) * e
  } else if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta)
    const e = Math.exp(-zeta * w0 * dt)
    const cos = Math.cos(wd * dt)
    const sin = Math.sin(wd * dt)
    y = e * (y0 * cos + ((v0 + zeta * w0 * y0) / wd) * sin)
    v = e * (v0 * cos - ((zeta * w0 * v0 + w0 * w0 * y0) / wd) * sin)
  } else {
    const root = Math.sqrt(zeta * zeta - 1)
    const r1 = -w0 * (zeta - root)
    const r2 = -w0 * (zeta + root)
    const c2 = (v0 - r1 * y0) / (r2 - r1)
    const c1 = y0 - c2
    const e1 = Math.exp(r1 * dt)
    const e2 = Math.exp(r2 * dt)
    y = c1 * e1 + c2 * e2
    v = r1 * c1 * e1 + r2 * c2 * e2
  }
  s.x = target + y
  s.v = v
}

/** True when the spring is close enough to `target` and slow enough to stop simulating. */
export function isSpringSettled(s: SpringState, target: number, eps = 0.01, vEps = 0.05): boolean {
  return Math.abs(s.x - target) < eps && Math.abs(s.v) < vEps
}

/**
 * Advance a falling body under constant gravity with linear drag (mutates `s`).
 * Closed form of v' = g - drag * v, exact for any dt.
 */
export function stepFall(s: SpringState, gravity: number, drag: number, dt: number): void {
  if (!(dt > 0)) return
  if (drag <= 0) {
    s.x += s.v * dt + 0.5 * gravity * dt * dt
    s.v += gravity * dt
    return
  }
  const vt = gravity / drag // terminal velocity
  const e = Math.exp(-drag * dt)
  s.x += vt * dt + ((s.v - vt) * (1 - e)) / drag
  s.v = vt + (s.v - vt) * e
}

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

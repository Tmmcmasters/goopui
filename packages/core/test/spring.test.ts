import { describe, expect, it } from 'vitest'
import { GOOP_PHYSICS, clampDt, isSpringSettled, springConfig, stepFall, stepSpring } from '../src'

const cfg = springConfig({ response: 0.4, dampingRatio: 0.35 })

function simulate(fps: number, seconds: number, jitter = false) {
  const s = { x: 0, v: 0 }
  let t = 0
  let i = 0
  while (t < seconds - 1e-9) {
    let dt = 1 / fps
    if (jitter) dt *= i++ % 3 === 0 ? 1.8 : 0.6
    dt = Math.min(dt, seconds - t)
    stepSpring(s, 1, cfg, dt)
    t += dt
  }
  return s
}

describe('spring integrator', () => {
  it('converges to the target and settles', () => {
    const c = springConfig(GOOP_PHYSICS.releaseSpring)
    const s = { x: 0.9, v: 0 }
    for (let i = 0; i < 240; i++) stepSpring(s, 1, c, 1 / 60)
    expect(isSpringSettled(s, 1, 1e-3, 1e-2)).toBe(true)
  })

  it('handles over-, critically, and under-damped regimes', () => {
    for (const dampingRatio of [0.2, 1, 3]) {
      const c = springConfig({ response: 0.3, dampingRatio })
      const a = { x: 0, v: 0 }
      const b = { x: 0, v: 0 }
      for (let i = 0; i < 60; i++) stepSpring(a, 1, c, 1 / 60)
      for (let i = 0; i < 6000; i++) stepSpring(b, 1, c, 1 / 6000)
      expect(Math.abs(a.x - b.x)).toBeLessThan(1e-9)
    }
  })

  it('underdamped springs overshoot; critically damped ones do not', () => {
    const bouncy = springConfig({ response: 0.3, dampingRatio: 0.3 })
    const crit = springConfig({ response: 0.3, dampingRatio: 1 })
    const a = { x: 0, v: 0 }
    const b = { x: 0, v: 0 }
    let maxA = 0
    let maxB = 0
    for (let i = 0; i < 120; i++) {
      stepSpring(a, 1, bouncy, 1 / 60)
      stepSpring(b, 1, crit, 1 / 60)
      maxA = Math.max(maxA, a.x)
      maxB = Math.max(maxB, b.x)
    }
    expect(maxA).toBeGreaterThan(1.2)
    expect(maxB).toBeLessThanOrEqual(1.0001)
  })

  it('is frame-rate independent (30 / 60 / 144 fps and jittery frames)', () => {
    for (const T of [0.1, 0.25, 0.5, 1]) {
      const ref = simulate(1000, T)
      for (const fps of [30, 60, 144]) {
        const s = simulate(fps, T)
        expect(Math.abs(s.x - ref.x)).toBeLessThan(1e-9)
        expect(Math.abs(s.v - ref.v)).toBeLessThan(1e-7)
      }
      expect(Math.abs(simulate(60, T, true).x - ref.x)).toBeLessThan(1e-9)
    }
  })

  it('viscosity slows the spring and damps it harder', () => {
    const thin = springConfig(GOOP_PHYSICS.retractSpring, 0.5)
    const thick = springConfig(GOOP_PHYSICS.retractSpring, 2)
    expect(thick.stiffness).toBeLessThan(thin.stiffness)
    const ratio = (c: { stiffness: number; damping: number }) => c.damping / (2 * Math.sqrt(c.stiffness))
    expect(ratio(thick)).toBeGreaterThan(ratio(thin))
  })

  it('clamps dt', () => {
    expect(clampDt(5)).toBe(GOOP_PHYSICS.maxDt)
    expect(clampDt(-1)).toBe(0)
    expect(clampDt(Number.NaN)).toBe(0)
    expect(clampDt(0.01)).toBe(0.01)
  })

  it('falls under gravity frame-rate independently', () => {
    const run = (fps: number) => {
      const s = { x: 0, v: 0 }
      for (let i = 0; i < Math.round(fps * 0.3); i++) stepFall(s, 900, 2.5, 1 / fps)
      return s.x
    }
    const a = run(30)
    const b = run(120)
    expect(a).toBeGreaterThan(30)
    expect(Math.abs(a - b)).toBeLessThan(1e-6)
  })
})

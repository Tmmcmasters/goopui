import { afterEach, describe, expect, it } from 'vitest'
import { GOOP_PHYSICS, ParticleFluid, drainRadius, liveParticleCount, type GoopBlob, type ParticleSpawn } from '../src'

function sink() {
  const live = new Set<object>()
  return {
    live,
    create: (): GoopBlob => {
      const o = {}
      live.add(o)
      return { set() {}, remove: () => live.delete(o) }
    },
  }
}

const base = (o: Partial<ParticleSpawn> = {}): ParticleSpawn => ({
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  r: 5,
  oiliness: 0.5,
  gravity: 700,
  vanish: 4,
  rand: 0.5,
  ...o,
})

const fluids: ParticleFluid[] = []
const make = (max?: number) => {
  const s = sink()
  const f = new ParticleFluid(s.create, max)
  fluids.push(f)
  return { f, s }
}
afterEach(() => {
  for (const f of fluids) f.clear()
  fluids.length = 0
})

describe('particle fluid', () => {
  it('respects the per-fluid and the global particle caps', () => {
    const { f } = make(10)
    for (let i = 0; i < 50; i++) f.spawn(base({ x: i }))
    expect(f.count).toBe(10)
    const many: ParticleFluid[] = []
    for (let k = 0; k < 20; k++) {
      const { f: g } = make(64)
      for (let i = 0; i < 64; i++) g.spawn(base({ x: i }))
      many.push(g)
    }
    expect(liveParticleCount()).toBe(GOOP_PHYSICS.maxParticlesGlobal)
  })

  it('stays stable under huge frame times (no explosion, no NaN), then drains away', () => {
    const { f, s } = make(64)
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < 60; i++) {
      f.spawn(base({ x: rnd() * 30, y: rnd() * 30, vx: (rnd() - 0.5) * 600, vy: (rnd() - 0.5) * 600, oiliness: 1, rand: rnd() }))
    }
    for (const dt of [0.05, 0.2, 1, 0.016]) {
      f.step(dt)
      for (const p of f.snapshot()) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.vy)).toBe(true)
        expect(Math.hypot(p.vx, p.vy)).toBeLessThan(5000)
      }
    }
    for (let i = 0; i < 400 && f.count; i++) f.step(1 / 60)
    expect(f.count).toBe(0)
    expect(s.live.size).toBe(0)
  })

  it('oil holds together where water flies apart', () => {
    const spread = (oiliness: number) => {
      const { f } = make()
      // a small blob bursting outward
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        f.spawn(base({ x: Math.cos(a) * 4, y: Math.sin(a) * 4, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, gravity: 0, oiliness }))
      }
      for (let i = 0; i < 12; i++) f.step(1 / 60)
      const ps = f.snapshot()
      const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length
      const cy = ps.reduce((s, p) => s + p.y, 0) / ps.length
      return ps.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / ps.length
    }
    expect(spread(1)).toBeLessThan(spread(0) * 0.75)
  })

  it('drain radius eases onto the vanish radius, then to 0, continuously', () => {
    let prev = drainRadius(8, 4, 0)
    for (let q = 0.01; q <= 1.26; q += 0.01) {
      const r = drainRadius(8, 4, q)
      expect(r).toBeLessThanOrEqual(prev + 1e-9)
      expect(prev - r).toBeLessThan(0.4)
      prev = r
    }
    expect(drainRadius(8, 4, 1)).toBeCloseTo(4)
    expect(drainRadius(8, 4, 1.25)).toBe(0)
  })
})

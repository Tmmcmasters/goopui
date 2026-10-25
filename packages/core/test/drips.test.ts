import { describe, expect, it } from 'vitest'
import { DripField, GOOP_DEFAULTS, GOOP_PHYSICS, type GoopBlob, type GoopRenderer } from '../src'

function fakeRenderer() {
  const blobs = new Set<{ x: number; y: number; r: number; o: number }>()
  const r: GoopRenderer & { blobs: typeof blobs } = {
    blobs,
    layer: {} as HTMLElement,
    setParams() {},
    setPadding() {},
    setBodyScale() {},
    createBlob(): GoopBlob {
      const s = { x: 0, y: 0, r: 0, o: 1 }
      blobs.add(s)
      return {
        set(x, y, rad, o = 1) {
          Object.assign(s, { x, y, r: rad, o })
        },
        remove() {
          blobs.delete(s)
        },
      }
    },
    flush() {},
    destroy() {},
  }
  return r
}

const ctx = { tuning: { ...GOOP_DEFAULTS }, width: 120, height: 40, sx: 1, sy: 1, pressed: false }
const half = () => 0.5

function run(field: DripField, seconds: number, fps = 60, onFrame?: () => void) {
  let active = true
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    active = field.step(1 / fps, ctx)
    onFrame?.()
  }
  return active
}

describe('drip model', () => {
  it('a fed drip swells, necks, detaches, falls, and is removed', () => {
    const r = fakeRenderer()
    const field = new DripField(r)
    let detached = 0
    field.onDetach = () => detached++
    const d = field.spawn(ctx.tuning, { x: 60, random: half })!
    expect(r.blobs.size).toBe(GOOP_PHYSICS.neckSegments + 2)

    run(field, GOOP_PHYSICS.swellTime * 0.5)
    expect(d.detached).toBe(false)
    expect(d.hang.x).toBeGreaterThan(0)
    expect(d.rad.x).toBeGreaterThan(0)

    let maxDropY = 0
    run(field, 1.5, 60, () => {
      if (d.drop) maxDropY = Math.max(maxDropY, d.drop.y.x)
    })
    expect(detached).toBe(1)
    // fell roughly `fall` px below where it let go (40 = edge, + dripLength hang)
    expect(maxDropY).toBeGreaterThan(40 + ctx.tuning.dripLength + ctx.tuning.fall * 0.6)
    expect(field.size).toBe(0)
    expect(r.blobs.size).toBe(0)
  })

  it('an un-fed drip retracts springily and is removed without detaching', () => {
    const r = fakeRenderer()
    const field = new DripField(r)
    let detached = 0
    field.onDetach = () => detached++
    const d = field.spawn(ctx.tuning, { x: 60, random: half })!
    run(field, 0.35)
    const hangAtLeave = d.hang.x
    expect(hangAtLeave).toBeGreaterThan(0.5)
    field.setFed(false)
    let minHang = Infinity
    run(field, 0.1, 60, () => (minHang = Math.min(minHang, d.hang.x)))
    expect(minHang).toBeLessThan(hangAtLeave)
    const active = run(field, 2)
    expect(active).toBe(false)
    expect(detached).toBe(0)
    expect(field.size).toBe(0)
  })

  it('re-feeding an attached drip resumes growth (interruptible)', () => {
    const field = new DripField(fakeRenderer())
    const d = field.spawn(ctx.tuning, { x: 60, random: half })!
    run(field, 0.3)
    field.setFed(false)
    run(field, 0.05)
    const m = d.m
    field.setFed(true)
    run(field, 0.1)
    expect(d.m).toBeGreaterThan(m)
    expect(field.size).toBe(1)
  })

  it('forced (tap) drips detach even when hover ends', () => {
    const field = new DripField(fakeRenderer())
    let detached = 0
    field.onDetach = () => detached++
    field.spawn(ctx.tuning, { x: 60, forced: true, random: half })
    field.setFed(false)
    run(field, 2)
    expect(detached).toBe(1)
  })

  it('delayed drips that lose hover before appearing never show', () => {
    const r = fakeRenderer()
    const field = new DripField(r)
    field.spawn(ctx.tuning, { x: 60, delay: 0.2, random: half })
    run(field, 0.05)
    field.setFed(false)
    run(field, 0.05)
    expect(field.size).toBe(0)
    expect(r.blobs.size).toBe(0)
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import {
  DRAWER_FEEL,
  DRAWER_GOO_ATTR,
  activeTickerCount,
  attachDrawer,
  createDrawerEdge,
  createDrawerHandleState,
  drawerBodyPose,
  drawerEdgeCircles,
  drawerEdgeCount,
  drawerEdgeSettled,
  drawerEdgeShape,
  drawerEdgeTargets,
  drawerHandlePose,
  drawerHandleSettled,
  kickDrawerEdge,
  stepDrawerEdge,
  stepDrawerHandle,
} from '../src'

const feel = DRAWER_FEEL.playful
const run = (secs: number, fn: (dt: number) => void, dt = 1 / 60) => {
  const steps = Math.round(secs / dt)
  for (let i = 0; i < steps; i++) fn(dt)
}

describe('drawer edge sim', () => {
  it('holds the corners more than the middle', () => {
    const n = 9
    expect(drawerEdgeShape(4, n)).toBeGreaterThan(drawerEdgeShape(0, n))
    expect(drawerEdgeShape(0, n)).toBeCloseTo(drawerEdgeShape(8, n), 6)
  })

  it('trails behind motion: moving in bulges out, moving out dips in (clamped)', () => {
    const base = { lag: 1, stretch: 1, length: 400 }
    const inward = drawerEdgeTargets(9, { ...base, velocity: -1500 }, feel)
    const outward = drawerEdgeTargets(9, { ...base, velocity: 1500 }, feel)
    expect(Math.max(...inward)).toBeGreaterThan(10)
    expect(Math.max(...inward)).toBeLessThanOrEqual(feel.bulge * 1.6)
    expect(Math.min(...outward)).toBeLessThan(0)
    expect(Math.min(...outward)).toBeGreaterThanOrEqual(-feel.dip)
  })

  it('lag: false means no trailing', () => {
    const t = drawerEdgeTargets(9, { velocity: -3000, lag: 0, stretch: 1, length: 400 }, feel)
    expect(t.every((v) => v === 0)).toBe(true)
  })

  it('stretch reaches toward a finger past the edge, peaking under it', () => {
    const t = drawerEdgeTargets(17, { velocity: 0, lag: 1, stretch: 1, length: 800, pointer: { u: 200, beyond: 60 } }, feel)
    const peak = t.indexOf(Math.max(...t))
    expect(Math.abs((peak / 16) * 800 - 200)).toBeLessThan(60)
    expect(Math.max(...t)).toBeGreaterThan(20)
    const off = drawerEdgeTargets(17, { velocity: 0, lag: 1, stretch: 0, length: 800, pointer: { u: 200, beyond: 60 } }, feel)
    expect(Math.max(...off)).toBeCloseTo(0, 6)
  })

  it('a kick overshoots and sloshes, then settles; slosh 0 never swings back past rest', () => {
    const wobbly = createDrawerEdge(9, 1)
    const flat = createDrawerEdge(9, 1)
    const zero = Array.from({ length: 9 }, () => 0)
    kickDrawerEdge(wobbly, 300)
    kickDrawerEdge(flat, 300)
    let minW = 0
    let minF = 0
    run(0.8, (dt) => {
      stepDrawerEdge(wobbly, zero, feel, dt, 1)
      stepDrawerEdge(flat, zero, feel, dt, 0)
      minW = Math.min(minW, wobbly.d[4]!)
      minF = Math.min(minF, flat.d[4]!)
    })
    expect(minW).toBeLessThan(-1)
    expect(minF).toBeGreaterThan(-0.5)
    run(3, (dt) => stepDrawerEdge(wobbly, zero, feel, dt, 1))
    expect(drawerEdgeSettled(wobbly, zero)).toBe(true)
  })

  it('is frame-rate independent enough (30 vs 144 fps)', () => {
    const a = createDrawerEdge(9, 2)
    const b = createDrawerEdge(9, 2)
    const target = Array.from({ length: 9 }, () => 20)
    run(0.5, (dt) => stepDrawerEdge(a, target, feel, dt), 1 / 30)
    run(0.5, (dt) => stepDrawerEdge(b, target, feel, dt), 1 / 144)
    expect(a.d[4]!).toBeCloseTo(b.d[4]!, 0)
  })

  it('scales column count with edge length, within bounds', () => {
    expect(drawerEdgeCount(100, feel)).toBeGreaterThanOrEqual(4)
    expect(drawerEdgeCount(5000, feel)).toBeLessThanOrEqual(64)
    expect(drawerEdgeCount(800, feel)).toBeGreaterThan(drawerEdgeCount(300, feel))
  })
})

describe('drawer geometry', () => {
  it('edge circles sit one radius in from the leading edge at rest', () => {
    const e = createDrawerEdge(6)
    const bottom = drawerEdgeCircles(e, 'bottom', 400, 300, 16)
    expect(bottom.every((c) => c.y === 16)).toBe(true)
    expect(bottom[0]!.x).toBe(16)
    expect(bottom.at(-1)!.x).toBeCloseTo(384, 6)
    const top = drawerEdgeCircles(e, 'top', 400, 300, 16)
    expect(top.every((c) => c.y === 284)).toBe(true)
    const left = drawerEdgeCircles(e, 'left', 300, 600, 16)
    expect(left.every((c) => c.x === 284)).toBe(true)
    const right = drawerEdgeCircles(e, 'right', 300, 600, 16)
    expect(right.every((c) => c.x === 16)).toBe(true)
  })

  it('a bulge pushes the circles outward', () => {
    const e = createDrawerEdge(6)
    e.d.fill(10)
    expect(drawerEdgeCircles(e, 'bottom', 400, 300, 16)[2]!.y).toBe(6)
    expect(drawerEdgeCircles(e, 'right', 300, 600, 16)[2]!.x).toBe(6)
  })

  it('body pose insets the leading side and extends the trailing side', () => {
    const p = drawerBodyPose('bottom', 400, 300, 16, 40)
    // body spans y in [16, 340]
    const top = 150 + p.ty - (300 * p.sy) / 2
    const bottom = 150 + p.ty + (300 * p.sy) / 2
    expect(top).toBeCloseTo(16, 6)
    expect(bottom).toBeCloseTo(340, 6)
    const r = drawerBodyPose('right', 300, 600, 16)
    expect(150 + r.tx - (300 * r.sx) / 2).toBeCloseTo(16, 6)
  })
})

describe('drawer handle', () => {
  it('swells on press, stretches with drag speed, trails a droplet, settles', () => {
    const st = createDrawerHandleState()
    run(0.3, (dt) => stepDrawerHandle(st, true, 1200, feel, 1, dt))
    const p = drawerHandlePose(st, 8)
    expect(p.across).toBeGreaterThan(1.1)
    expect(p.dropR).toBeGreaterThan(0)
    expect(p.drop).toBeLessThan(0)
    run(3, (dt) => stepDrawerHandle(st, false, 0, feel, 1, dt))
    expect(drawerHandleSettled(st)).toBe(true)
    expect(drawerHandlePose(st, 8).dropR).toBe(0)
  })
})

describe('attachDrawer (DOM)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const panel = () => {
    const host = document.createElement('div')
    host.setAttribute('data-vaul-drawer-direction', 'bottom')
    host.setAttribute('data-state', 'open')
    const grip = document.createElement('div')
    grip.setAttribute('data-goop-drawer-handle', '')
    host.append(grip)
    document.body.append(host)
    return { host, grip }
  }

  it('builds a surface + handle goo and cleans up on destroy', () => {
    const { host, grip } = panel()
    const h = attachDrawer(host, { renderer: 'svg', reducedMotion: false })
    expect(host.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
    expect(host.querySelector('[data-goop="surface"]')).not.toBeNull()
    expect(grip.querySelector('[data-goop="layer"]')).not.toBeNull()
    expect(h.edge.length).toBeGreaterThanOrEqual(4)
    h.destroy()
    expect(host.hasAttribute(DRAWER_GOO_ATTR)).toBe(false)
    expect(host.querySelector('[data-goop="surface"]')).toBeNull()
    expect(grip.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('handle: false skips the handle goo', () => {
    const { host, grip } = panel()
    const h = attachDrawer(host, { renderer: 'svg', reducedMotion: false, handle: false })
    expect(grip.querySelector('[data-goop="layer"]')).toBeNull()
    h.destroy()
  })

  it('reduced motion: static goo, no ticker, kicks ignored', () => {
    const { host } = panel()
    const before = activeTickerCount()
    const h = attachDrawer(host, { renderer: 'svg', reducedMotion: true })
    expect(h.reducedMotion).toBe(true)
    expect(host.hasAttribute('data-goop-still')).toBe(true)
    h.kick(500)
    expect(h.edge.every((v) => v === 0)).toBe(true)
    expect(activeTickerCount()).toBe(before)
    h.destroy()
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import {
  DRAWER_FEEL,
  DRAWER_GOO_ATTR,
  activeTickerCount,
  createDrawer,
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
  DRAWER_PHYSICS,
  createDrawerVelocityTracker,
  drawerBackgroundScale,
  drawerDragOffset,
  drawerFade,
  drawerReleaseTarget,
  drawerRubberBand,
  drawerSnapIndex,
  drawerSnapOffsets,
  drawerSnapVisible,
  drawerSplashDrops,
  drawerTrack,
  drawerTransform,
  drawerVelocity,
  stepDrawerSpring,
  DRAWER_MOTION,
  planDrawerMove,
  sampleDrawerMove,
  stepDrawerMove,
  type DrawerMove,
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

describe('drawer physics', () => {
  it('resolves snap points (fractions and px) to offsets from fully open', () => {
    expect(drawerSnapVisible(0.5, 800)).toBe(400)
    expect(drawerSnapVisible('300px', 800)).toBe(300)
    expect(drawerSnapVisible('25%', 800)).toBe(200)
    expect(drawerSnapOffsets(undefined, 600, 800)).toEqual([0])
    expect(drawerSnapOffsets([0.25, '400px', 1], 600, 800)).toEqual([400, 200, 0])
    expect(drawerSnapIndex([0.25, '400px', 1], '400px')).toBe(1)
    expect(drawerSnapIndex([0.25, 0.5], 0.7)).toBe(-1)
  })

  it('rubber-bands past full open (never reaching the limit) and past the lowest point when not dismissible', () => {
    const b = { min: 0, max: 0, size: 500, dismissible: true, dimension: 800 }
    expect(drawerDragOffset(120, b)).toBe(120)
    const over = drawerDragOffset(-300, b)
    expect(over).toBeLessThan(0)
    expect(over).toBeGreaterThan(-300)
    expect(drawerDragOffset(-3000, b)).toBeGreaterThan(-800)
    expect(drawerRubberBand(100, 800)).toBeLessThan(100)
    const stuck = drawerDragOffset(300, { ...b, dismissible: false })
    expect(stuck).toBeGreaterThan(0)
    expect(stuck).toBeLessThan(300)
  })

  it('tracks release velocity over the last ~100ms only', () => {
    const tr = createDrawerVelocityTracker()
    for (let i = 0; i <= 50; i++) drawerTrack(tr, i * 0.016, i < 40 ? i * 2 : 78 + (i - 39) * 30)
    const v = drawerVelocity(tr, 50 * 0.016)
    expect(v).toBeGreaterThan(1500)
    // A finger that stopped before lifting has no velocity.
    expect(drawerVelocity(tr, 50 * 0.016 + 0.3)).toBe(0)
  })

  const base = { size: 500, viewport: 800, snaps: [0], active: 0, dismissible: true, hasSnapPoints: false, dragged: 0 }
  it('release without snap points: flick or past closeThreshold closes, else back open', () => {
    expect(drawerReleaseTarget({ ...base, offset: 40, velocity: 900 })).toEqual({ kind: 'close' })
    expect(drawerReleaseTarget({ ...base, offset: 40, velocity: 100 })).toEqual({ kind: 'snap', index: 0 })
    expect(drawerReleaseTarget({ ...base, offset: 200, velocity: 0 })).toEqual({ kind: 'close' })
    expect(drawerReleaseTarget({ ...base, offset: 200, velocity: 0, closeThreshold: 0.5 })).toEqual({ kind: 'snap', index: 0 })
    expect(drawerReleaseTarget({ ...base, offset: 300, velocity: 3000, dismissible: false })).toEqual({ kind: 'snap', index: 0 })
  })

  it('release with snap points: flicks step one point, hard flings jump, slow releases pick the closest', () => {
    const s = { ...base, hasSnapPoints: true, snaps: [400, 200, 0], active: 1, offset: 180 }
    expect(drawerReleaseTarget({ ...s, velocity: -800, dragged: -20 })).toEqual({ kind: 'snap', index: 2 })
    expect(drawerReleaseTarget({ ...s, velocity: 800, dragged: 20 })).toEqual({ kind: 'snap', index: 0 })
    expect(drawerReleaseTarget({ ...s, velocity: 0 })).toEqual({ kind: 'snap', index: 1 })
    expect(drawerReleaseTarget({ ...s, velocity: 0, offset: 330 })).toEqual({ kind: 'snap', index: 0 })
    expect(drawerReleaseTarget({ ...s, velocity: 2600 })).toEqual({ kind: 'close' })
    expect(drawerReleaseTarget({ ...s, velocity: -2600 })).toEqual({ kind: 'snap', index: 2 })
    expect(drawerReleaseTarget({ ...s, active: 0, offset: 420, velocity: 800, dragged: 20 })).toEqual({ kind: 'close' })
    expect(drawerReleaseTarget({ ...s, active: 0, offset: 420, velocity: 800, dragged: 20, dismissible: false })).toEqual({ kind: 'snap', index: 0 })
    // Dragged well below the lowest point, slowly: closes.
    expect(drawerReleaseTarget({ ...s, active: 0, offset: 480, velocity: 0 })).toEqual({ kind: 'close' })
  })

  it('springs land on target', () => {
    const s = { x: 500, v: 0 }
    let done = false
    for (let i = 0; i < 240 && !done; i++) done = stepDrawerSpring(s, 0, 1 / 60, { period: 0.4, damping: 0.8 })
    expect(done).toBe(true)
    expect(s.x).toBe(0)
  })

  /** Run a move at 240 Hz: positions, velocities, the time it finished. */
  const trace = (m: DrawerMove) => {
    const s = { x: m.from, v: 0 }
    const xs: number[] = []
    const vs: number[] = []
    let end = -1
    for (let i = 1; i <= 480 && end < 0; i++) {
      if (stepDrawerMove(m, s, 1 / 240)) end = i / 240
      xs.push(s.x)
      vs.push(s.v)
    }
    return { xs, vs, end, x: s.x }
  }

  it('open: fast travel that keeps its speed, a small landing overshoot, one damped rebound', () => {
    const f = DRAWER_MOTION.playful
    const m = planDrawerMove({ from: 420, to: 0, velocity: 0, kind: 'land', feel: f })!
    expect(m.kind).toBe('land')
    const { xs, vs, end, x } = trace(m)
    expect(x).toBe(0)
    // About vaul's 0.5 s.
    expect(end).toBeGreaterThan(0.4)
    expect(end).toBeLessThan(0.75)
    // Impact (end of travel) still carries most of the peak speed.
    const peak = Math.max(...vs.map((v) => -v))
    const iImpact = Math.round(m.duration * 240) - 1
    expect(-vs[iImpact]!).toBeGreaterThan(peak * 0.6)
    // Overshoot past the target: a few % of the travel, capped in px.
    const over = -Math.min(...xs)
    expect(over).toBeGreaterThan(4)
    expect(over).toBeLessThanOrEqual(Math.min(f.overshoot * 420, f.overshootMax) + 0.5)
    // One rebound, much smaller than the overshoot.
    const after = xs.slice(xs.indexOf(-over))
    expect(Math.max(...after)).toBeLessThan(over * 0.35)
    // Velocity never jumps (continuous across travel -> landing).
    const before = sampleDrawerMove(m, m.duration - 1e-6)
    const at = sampleDrawerMove(m, m.duration + 1e-6)
    expect(at.v).toBeCloseTo(before.v, 0)
    expect(at.x).toBeCloseTo(before.x, 2)
    // Overshoot limit (a plain panel never lifts off its screen edge).
    const flat = trace(planDrawerMove({ from: 420, to: 0, velocity: 0, kind: 'land', feel: f, overshootLimit: 0 })!)
    expect(Math.min(...flat.xs)).toBeGreaterThanOrEqual(-0.01)
  })

  it('a release carries its velocity into the move', () => {
    const m = planDrawerMove({ from: 120, to: 0, velocity: -1500, kind: 'land' })!
    expect(sampleDrawerMove(m, 0).v).toBeCloseTo(-1500, 0)
    const { x } = trace(m)
    expect(x).toBe(0)
    // Short moves are all landing, from the state they're in.
    const s = planDrawerMove({ from: 8, to: 0, velocity: -300, kind: 'land' })!
    expect(sampleDrawerMove(s, 0)).toMatchObject({ x: 8 })
    expect(sampleDrawerMove(s, 0).v).toBeCloseTo(-300, 6)
    expect(planDrawerMove({ from: 0, to: 0.1, velocity: 1, kind: 'land' })).toBeNull()
  })

  it('close falls out: starts slow, accelerates, never bounces; a fling leaves sooner', () => {
    const m = planDrawerMove({ from: 0, to: 420, velocity: 0, kind: 'fall' })!
    const { xs, vs, end, x } = trace(m)
    expect(x).toBe(420)
    expect(end).toBeGreaterThan(0.25)
    expect(end).toBeLessThan(0.5)
    // Ease-in: the first quarter of the time covers well under a quarter of the way.
    expect(xs[Math.floor(xs.length / 4)]!).toBeLessThan(420 * 0.1)
    for (let i = 1; i < vs.length; i++) expect(vs[i]!).toBeGreaterThanOrEqual(vs[i - 1]! - 1e-6)
    const fling = planDrawerMove({ from: 0, to: 420, velocity: 2500, kind: 'fall' })!
    expect(sampleDrawerMove(fling, 0).v).toBe(2500)
    expect(trace(fling).end).toBeLessThan(end * 0.6)
  })

  it('reduced motion: a short ease, no overshoot', () => {
    const m = planDrawerMove({ from: 420, to: 0, velocity: 0, kind: 'land', reduced: true })!
    expect(m.kind).toBe('ease')
    const { xs, end } = trace(m)
    expect(end).toBeLessThanOrEqual(DRAWER_PHYSICS.still + 1 / 240)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
  })

  it('presets: wilder lands with more overshoot', () => {
    const o = (p: 'subtle' | 'playful' | 'wild') => -Math.min(...trace(planDrawerMove({ from: 400, to: 0, velocity: 0, kind: 'land', feel: DRAWER_MOTION[p] })!).xs)
    expect(o('subtle')).toBeLessThan(o('playful'))
    expect(o('playful')).toBeLessThan(o('wild'))
  })

  it('overlay fade follows the travel, or only the fadeFromIndex snap range', () => {
    expect(drawerFade(0, 500, [0], false)).toBe(1)
    expect(drawerFade(250, 500, [0], false)).toBeCloseTo(0.5, 6)
    expect(drawerFade(400, 500, [400, 200, 0], true)).toBe(0)
    expect(drawerFade(200, 500, [400, 200, 0], true)).toBe(0)
    expect(drawerFade(100, 500, [400, 200, 0], true)).toBeCloseTo(0.5, 6)
    expect(drawerFade(200, 500, [400, 200, 0], true, 1)).toBe(1)
  })
})

describe('drawer pose', () => {
  it('translates toward the attached edge, and recedes when nested', () => {
    expect(drawerTransform('bottom', 100)).toBe('translate3d(0px, 100px, 0)')
    expect(drawerTransform('top', 100)).toBe('translate3d(0px, -100px, 0)')
    expect(drawerTransform('left', 50)).toBe('translate3d(-50px, 0px, 0)')
    expect(drawerTransform('right', 50)).toBe('translate3d(50px, 0px, 0)')
    expect(drawerTransform('bottom', 0, 1, 1000)).toBe('translate3d(0px, -16px, 0) scale(0.984)')
  })

  it('background scale matches vaul at full open and is identity at 0', () => {
    const on = drawerBackgroundScale('bottom', 1, 1300)
    expect(on.transform).toBe('scale(0.98) translate3d(0px, 14px, 0)')
    expect(on.borderRadius).toBe('8px')
    expect(on.transformOrigin).toBe('top')
    expect(drawerBackgroundScale('left', 0, 1300).transform).toBe('scale(1) translate3d(0px, 0px, 0)')
  })

  it('fling splash: mixed drops off the leading edge, flung outward, short-lived; none at strength 0', () => {
    const rect = { left: 0, top: 300, width: 400, height: 500 }
    const drops = drawerSplashDrops({ dir: 'bottom', rect, speed: 2000, strength: 1, seed: 3 })
    expect(drops.length).toBeGreaterThan(5)
    const rs = drops.map((d) => d.r)
    expect(Math.max(...rs)).toBeGreaterThan(Math.min(...rs) * 2.5)
    for (const d of drops) {
      expect(d.y).toBeLessThanOrEqual(300)
      expect(d.x).toBeGreaterThanOrEqual(0)
      expect(d.x).toBeLessThanOrEqual(400)
      expect(d.life).toBeLessThan(1)
    }
    // Most drops fly up out of a bottom drawer's top edge.
    expect(drops.filter((d) => d.vy < 0).length).toBeGreaterThan(drops.length / 2)
    expect(drawerSplashDrops({ dir: 'bottom', rect, speed: 2000, strength: 0 })).toEqual([])
    const left = drawerSplashDrops({ dir: 'left', rect, speed: 2000, strength: 1, seed: 3 })
    expect(left.filter((d) => d.vx > 0).length).toBeGreaterThan(left.length / 2)
  })
})

describe('createDrawer (DOM)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const panel = (h = 400) => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'offsetHeight', { value: h, configurable: true })
    Object.defineProperty(host, 'offsetWidth', { value: 600, configurable: true })
    const grip = document.createElement('div')
    grip.setAttribute('data-goop-drawer-handle', '')
    host.append(grip)
    document.body.append(host)
    return { host, grip }
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const until = async (fn: () => boolean, ms = 3000) => {
    const t0 = Date.now()
    while (!fn() && Date.now() - t0 < ms) await wait(16)
    return fn()
  }

  it('builds a surface + handle goo, starts hidden, and cleans up on destroy', () => {
    const { host, grip } = panel()
    const h = createDrawer(host, { renderer: 'svg', reducedMotion: false })
    expect(host.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
    expect(host.querySelector('[data-goop="surface"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(grip.querySelector('[data-goop="layer"]')).not.toBeNull()
    expect(h.state).toBe('closed')
    expect(h.offset).toBeGreaterThanOrEqual(400)
    expect(host.style.transform).toContain('translate3d(0px, ')
    h.destroy()
    expect(host.hasAttribute(DRAWER_GOO_ATTR)).toBe(false)
    expect(host.querySelector('[data-goop="surface"]')).toBeNull()
    expect(grip.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('goo: false drives the panel with no surface; handle: false skips the handle goo', () => {
    const { host, grip } = panel()
    const h = createDrawer(host, { goo: false })
    expect(host.querySelector('[data-goop="surface"]')).toBeNull()
    expect(grip.querySelector('[data-goop="layer"]')).toBeNull()
    h.destroy()
    const h2 = createDrawer(host, { renderer: 'svg', handle: false })
    expect(grip.querySelector('[data-goop="layer"]')).toBeNull()
    h2.destroy()
  })

  it('opens onto the active snap point, snaps, closes, and reports each settle', async () => {
    const { host } = panel(600)
    const settled: boolean[] = []
    const h = createDrawer(host, { renderer: 'svg', snapPoints: [0.25, 1], activeSnapPoint: 0.25 }, { onSettle: (o) => settled.push(o) })
    const vh = window.innerHeight
    h.open()
    expect(h.state).toBe('opening')
    expect(await until(() => h.state === 'open')).toBe(true)
    expect(h.offset).toBeCloseTo(Math.max(0, 600 - 0.25 * vh), 0)
    h.snapTo(1)
    expect(await until(() => Math.abs(h.offset) < 0.6)).toBe(true)
    h.close()
    expect(await until(() => h.state === 'closed')).toBe(true)
    expect(settled).toEqual([true, false])
    h.destroy()
  })

  it('open({ instant }) lands at once (defaultOpen)', () => {
    const { host } = panel()
    const settled: boolean[] = []
    const h = createDrawer(host, { goo: false }, { onSettle: (o) => settled.push(o) })
    h.open({ instant: true })
    expect(h.state).toBe('open')
    expect(h.offset).toBe(0)
    expect(settled).toEqual([true])
    h.destroy()
  })

  it('reduced motion: static goo, kicks ignored, still opens', async () => {
    const { host } = panel()
    const h = createDrawer(host, { renderer: 'svg', reducedMotion: true })
    expect(h.reducedMotion).toBe(true)
    expect(host.hasAttribute('data-goop-still')).toBe(true)
    h.kick(500)
    expect(h.edge.every((v) => v === 0)).toBe(true)
    h.open()
    expect(await until(() => h.state === 'open')).toBe(true)
    expect(h.edge.every((v) => v === 0)).toBe(true)
    h.destroy()
  })
})

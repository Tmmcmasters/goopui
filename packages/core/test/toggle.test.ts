import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  TOGGLE_ALL_EFFECTS,
  TOGGLE_BRIDGE_MAX,
  TOGGLE_FEEL,
  TOGGLE_FILLED_ATTR,
  TOGGLE_FLIGHT_CIRCLES,
  TOGGLE_ITEM_EXTRA,
  activeTickerCount,
  attachToggle,
  attachToggleGroup,
  toggleAnimEnd,
  toggleBridgeCircles,
  toggleFillCircles,
  toggleFlightLand,
  toggleFlightPose,
  toggleGrid,
  toggleLevel,
  togglePose,
  toggleSeam,
  type GooCircle,
  type ToggleAnim,
  type ToggleRect,
} from '../src'

const feel = TOGGLE_FEEL.playful
const fx = TOGGLE_ALL_EFFECTS
const visible = (cs: GooCircle[]): GooCircle[] => cs.filter((c) => c.r > 0)
const A: ToggleRect = { x: 0, y: 0, w: 72, h: 36 }
const B: ToggleRect = { x: 72, y: 0, w: 72, h: 36 }
const flood = (origin = { x: 10, y: 18 }, from = 0): ToggleAnim => ({ on: true, origin, start: 0, from, splash: true })
const drain = (origin = { x: 10, y: 18 }): ToggleAnim => ({ on: false, origin, start: 0, from: 1, splash: false })
const full: ToggleAnim = { on: true, origin: { x: 0, y: 0 }, start: -100, from: 1, splash: false }
const empty: ToggleAnim = { on: false, origin: { x: 0, y: 0 }, start: -100, from: 0, splash: false }

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('toggle fill', () => {
  it('grid covers the rect from inside', () => {
    const g = toggleGrid(A, 9)
    expect(g.length).toBeGreaterThan(6)
    expect(Math.min(...g.map((p) => p.x))).toBe(9)
    expect(Math.max(...g.map((p) => p.x))).toBeCloseTo(63)
    expect(Math.max(...g.map((p) => p.y))).toBeCloseTo(27)
  })

  it('floods out of the press point: near circles first, all full at the end', () => {
    const early = toggleFillCircles({ rect: A, anim: flood() }, feel.flood * 0.2, feel, fx)
    const g = toggleGrid(A, 9)
    const grid = early.slice(0, g.length)
    const near = grid[g.findIndex((p) => p.x === 9)]!
    const far = grid[g.findIndex((p) => Math.abs(p.x - 63) < 0.01)]!
    expect(near.r).toBeGreaterThan(far.r)
    const end = toggleAnimEnd(flood(), feel, fx)
    const done = toggleFillCircles({ rect: A, anim: flood() }, end, feel, fx).slice(0, g.length)
    expect(done.every((c) => Math.abs(c.r - 9) < 1e-6)).toBe(true)
  })

  it('crest swells circles past their rest size while the front moves', () => {
    const t = feel.flood * 0.35
    const n = toggleGrid(A, 9).length
    const max = Math.max(...toggleFillCircles({ rect: A, anim: flood() }, t, feel, fx).slice(0, n).map((c) => c.r))
    expect(max).toBeGreaterThan(9)
    const flat = Math.max(...toggleFillCircles({ rect: A, anim: flood() }, t, feel, { ...fx, wobble: 0 }).slice(0, n).map((c) => c.r))
    expect(flat).toBeLessThanOrEqual(9 + 1e-6)
  })

  it('drains back to nothing; flood off snaps', () => {
    expect(toggleLevel(drain(), feel.drain * 0.5, feel, fx).p).toBeGreaterThan(0)
    expect(toggleLevel(drain(), feel.drain + 0.01, feel, fx).p).toBe(0)
    expect(visible(toggleFillCircles({ rect: A, anim: drain() }, feel.drain + 0.01, feel, fx))).toHaveLength(0)
    expect(toggleLevel(flood(), 0, feel, { ...fx, flood: 0 }).p).toBe(1)
  })

  it('splashes droplets above the top edge, none when droplets are off', () => {
    const n = toggleGrid(A, 9).length + 1
    const t = feel.flood * 0.45 + 0.12
    const drops = visible(toggleFillCircles({ rect: A, anim: flood({ x: 36, y: 18 }) }, t, feel, fx).slice(n))
    expect(drops.length).toBeGreaterThan(0)
    expect(drops.some((d) => d.y < 0)).toBe(true)
    expect(visible(toggleFillCircles({ rect: A, anim: flood({ x: 36, y: 18 }) }, t, feel, { ...fx, droplets: 0 }).slice(n))).toHaveLength(0)
  })
})

describe('toggle merge and flow', () => {
  it('finds neighbours by geometry', () => {
    expect(toggleSeam(A, B, 16)).toEqual({ axis: 'x', gap: 0, flip: false })
    expect(toggleSeam(A, { ...B, x: 200 }, 16)).toBeNull()
    expect(toggleSeam(A, { x: 0, y: 40, w: 72, h: 36 }, 16)?.axis).toBe('y')
  })

  it('bridges two full neighbours, necks at the middle row as it weakens', () => {
    const strong = visible(toggleBridgeCircles(A, B, 1))
    expect(strong.length).toBeGreaterThan(1)
    const weak = visible(toggleBridgeCircles(A, B, 0.3))
    expect(weak.length).toBeGreaterThan(0)
    expect(weak.length).toBeLessThan(strong.length)
    expect(toggleBridgeCircles(A, B, 0)).toHaveLength(TOGGLE_BRIDGE_MAX)
    expect(visible(toggleBridgeCircles(A, B, 0))).toHaveLength(0)
  })

  it('pose merges pressed neighbours only with merge on, and pulls them apart with merge off', () => {
    const items = [{ rect: A, anim: full }, { rect: B, anim: full }]
    expect(togglePose(items, [], 0, feel, fx).bridges).toEqual([1])
    expect(togglePose([{ rect: A, anim: full }, { rect: B, anim: empty }], [], 0, feel, fx).bridges).toEqual([0])
    const off = togglePose(items, [], 0, feel, { ...fx, merge: 0 }, { sep: 4 })
    expect(off.bridges).toEqual([0])
    const n = toggleGrid(A, 9).length
    const aRight = Math.max(...off.circles.slice(0, n).map((c) => c.x + c.r))
    expect(aRight).toBeLessThan(72)
  })

  it('a draining neighbour tears the bridge', () => {
    const tear = (t: number) => togglePose([{ rect: A, anim: full }, { rect: B, anim: drain({ x: 108, y: 18 }) }], [], t, feel, fx).bridges[0]!
    expect(tear(0)).toBe(1)
    expect(tear(feel.drain)).toBe(0)
  })

  it('a tight (group) drain recedes from its first frame and stays continuous', () => {
    const g = toggleGrid(A, 9).length
    const area = (cs: GooCircle[]): number => cs.slice(0, g).reduce((s, c) => s + c.r * c.r, 0)
    const at = (u: number, tight: boolean): number => area(toggleFillCircles({ rect: A, anim: drain(), tightDrain: tight }, feel.drain * u, feel, fx))
    const rest = area(toggleFillCircles({ rect: A, anim: full }, 0, feel, fx))
    expect(at(0, true)).toBeCloseTo(rest, 3)
    // Old shape: a quarter in, the loose drain still looks full; the tight one has visibly receded.
    expect(at(0.25, false)).toBeCloseTo(rest, 3)
    expect(at(0.25, true)).toBeLessThan(rest * 0.97)
    expect(at(0.5, true)).toBeLessThan(rest * 0.8)
    // Monotonic and done at the end.
    let prev = Infinity
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const a = at(u, true)
      expect(a).toBeLessThanOrEqual(prev + 1e-6)
      prev = a
    }
    expect(visible(toggleFillCircles({ rect: A, anim: drain(), tightDrain: true }, feel.drain, feel, fx))).toHaveLength(0)
  })

  it('a tight drain that interrupts a flood starts where the flood front was', () => {
    const g = toggleGrid(A, 9).length
    const t = feel.flood * 0.3
    const fl = flood()
    const p = toggleLevel(fl, t, feel, { ...fx, wobble: 0 }).p
    const noCrest = { ...fx, wobble: 0, droplets: 0 }
    const before = toggleFillCircles({ rect: A, anim: fl }, t, feel, noCrest).slice(0, g)
    const after = toggleFillCircles({ rect: A, anim: { on: false, origin: fl.origin, start: t, from: p, splash: false }, tightDrain: true }, t, feel, noCrest).slice(0, g)
    after.forEach((c, i) => expect(c.r).toBeCloseTo(before[i]!.r, 6))
  })

  it('flight gathers, stretches on a neck, travels and soaks in', () => {
    const f = { from: { x: 63, y: 18 }, to: { x: 200, y: 18 }, start: 0, gather: 0.15, travel: 0.3, r: 11, bridged: true }
    expect(toggleFlightPose(f, 0, feel, fx).circles).toHaveLength(TOGGLE_FLIGHT_CIRCLES)
    const mid = toggleFlightPose(f, 0.15 + 0.08, feel, fx)
    expect(mid.at!.x).toBeGreaterThan(63)
    expect(mid.circles[0]!.sx).toBeGreaterThan(1)
    expect(visible(mid.circles.slice(3)).length).toBeGreaterThan(0)
    const landed = toggleFlightPose(f, toggleFlightLand(f) + 0.2, feel, fx)
    expect(landed.at).toBeNull()
    expect(visible(landed.circles)).toHaveLength(0)
  })
})

describe('attachToggle / attachToggleGroup', () => {
  const button = (on = false): HTMLButtonElement => {
    const b = document.createElement('button')
    b.setAttribute('aria-pressed', String(on))
    b.setAttribute('data-state', on ? 'on' : 'off')
    document.body.append(b)
    return b
  }
  const press = (b: Element, on: boolean): void => {
    b.setAttribute('aria-pressed', String(on))
    b.setAttribute('data-state', on ? 'on' : 'off')
  }

  it('adds one aria-hidden layer, floods on press, cleans up', async () => {
    const b = button()
    const h = attachToggle(b)
    const layer = b.querySelector(`[${GOOP_PART_ATTR}="layer"]`)!
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(h.running).toBe(false)
    press(b, true)
    await Promise.resolve()
    expect(h.running).toBe(true)
    expect(h.pose!.levels).toHaveLength(1)
    h.destroy()
    expect(b.querySelector(`[${GOOP_PART_ATTR}="layer"]`)).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion shows the pressed fill without running', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const b = button()
    const h = attachToggle(b, { reducedMotion: true })
    press(b, true)
    h.update({})
    expect(h.running).toBe(false)
    expect(h.pose!.levels).toEqual([1])
    h.destroy()
  })

  it('group: a single-select change starts a flow', async () => {
    const root = document.createElement('div')
    const items = [button(true), button(), button()]
    root.append(...items)
    document.body.append(root)
    const h = attachToggleGroup(root)
    expect(h.pose!.levels).toEqual([1, 0, 0])
    const n = h.pose!.circles.length
    press(items[0]!, false)
    press(items[2]!, true)
    h.update({ value: 'c' })
    expect(h.running).toBe(true)
    expect(h.pose!.circles.length).toBe(n + TOGGLE_FLIGHT_CIRCLES)
    expect(h.pose!.circles.length).toBeGreaterThan(3 * TOGGLE_ITEM_EXTRA)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  })

  it('group: an un-pressed item is marked filled until its drain has finished', async () => {
    const root = document.createElement('div')
    const items = [button(true), button(true)]
    root.append(...items)
    document.body.append(root)
    const h = attachToggleGroup(root)
    expect(items.every((b) => b.hasAttribute(TOGGLE_FILLED_ATTR))).toBe(true)
    press(items[1]!, false)
    h.update({ value: ['a'] })
    // Still draining: its own hover background must not cover the goo yet.
    expect(items[1]!.hasAttribute(TOGGLE_FILLED_ATTR)).toBe(true)
    expect(h.running).toBe(true)
    await new Promise((r) => setTimeout(r, (feel.drain + 0.25) * 1000))
    expect(h.pose!.levels).toEqual([1, 0])
    expect(items[1]!.hasAttribute(TOGGLE_FILLED_ATTR)).toBe(false)
    expect(items[0]!.hasAttribute(TOGGLE_FILLED_ATTR)).toBe(true)
    h.destroy()
    expect(items[0]!.hasAttribute(TOGGLE_FILLED_ATTR)).toBe(false)
    // A single toggle is never marked (its goo layer sits under its own background).
    const b = button(true)
    const t = attachToggle(b)
    expect(b.hasAttribute(TOGGLE_FILLED_ATTR)).toBe(false)
    t.destroy()
  })

  it('group: deselecting mid-flow keeps the blob in flight instead of dropping it', () => {
    const root = document.createElement('div')
    const items = [button(true), button(), button()]
    root.append(...items)
    document.body.append(root)
    const h = attachToggleGroup(root)
    const n = h.pose!.circles.length
    press(items[0]!, false)
    press(items[2]!, true)
    h.update({ value: 'c' })
    press(items[2]!, false)
    h.update({ value: null })
    expect(h.pose!.circles.length).toBe(n + TOGGLE_FLIGHT_CIRCLES)
    expect(h.running).toBe(true)
    h.destroy()
  })
})

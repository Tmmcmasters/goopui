import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  PROGRESS_CIRCLES,
  PROGRESS_FEEL,
  PROGRESS_FILL_SEGMENTS,
  SLIDER_FEEL,
  SLIDER_FILL_SEGMENTS,
  SWITCH_SPLAT,
  activeTickerCount,
  attachProgress,
  attachSlider,
  createSlosh,
  decayWobble,
  hangingDrip,
  liquidBar,
  progressDripStarts,
  progressPose,
  progressSlug,
  sliderPose,
  sliderSpring,
  sliderThumbCircles,
  sliderThumbDeform,
  sloshSettled,
  stepSlosh,
  stepSpring,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const visible = <C extends { r: number }>(cs: C[]): C[] => cs.filter((c) => c.r > 0)

describe('liquid helpers', () => {
  it('decayWobble: zero before the kick and from settle on, squash first, wobble scaled after', () => {
    const { freq, damping } = SWITCH_SPLAT
    expect(decayWobble(0, freq, damping, 0.6)).toBe(0)
    expect(decayWobble(-1, freq, damping, 0.6)).toBe(0)
    expect(decayWobble(0.6, freq, damping, 0.6)).toBe(0)
    expect(decayWobble(0.05, freq, damping, 0.6)).toBeGreaterThan(0)
    // Second half-cycle (rebound) is scaled by `after`.
    const a = 0.75 / freq
    expect(Math.abs(decayWobble(a, freq, damping, 0.6, 0))).toBe(0)
    expect(decayWobble(a, freq, damping, 0.6, 1)).toBeLessThan(0)
  })

  it('slosh: piles toward the push, sloshes back, decays to rest', () => {
    const s = createSlosh()
    for (let i = 0; i < 20; i++) stepSlosh(s, 1500, 1 / 60)
    expect(s.x).toBeGreaterThan(0.2)
    const peak = s.x
    let min = Infinity
    let steps = 0
    while (!sloshSettled(s) && steps < 600) {
      stepSlosh(s, 0, 1 / 60)
      min = Math.min(min, s.x)
      steps++
    }
    expect(min).toBeLessThan(-0.05 * peak) // sloshed back past rest
    expect(sloshSettled(s)).toBe(true)
    expect(steps).toBeLessThan(400) // within ~6s
  })

  it('slosh decay is frame-rate independent', () => {
    const a = createSlosh()
    const b = createSlosh()
    a.x = b.x = 0.8
    for (let i = 0; i < 30; i++) stepSlosh(a, 0, 1 / 30)
    for (let i = 0; i < 120; i++) stepSlosh(b, 0, 1 / 120)
    expect(a.x).toBeCloseTo(b.x, 6)
  })

  it('liquidBar: fixed segment count spanning the bar; heaps toward the pile; empty is all r = 0', () => {
    const flat = liquidBar({ a: 10, b: 210, cross: 5, r: 3, segments: 12 })
    expect(flat).toHaveLength(12)
    expect(flat[0]!.x - flat[0]!.r * flat[0]!.sx).toBeCloseTo(10)
    expect(flat[11]!.x + flat[11]!.r * flat[11]!.sx).toBeCloseTo(210)
    expect(new Set(flat.map((c) => c.r)).size).toBe(1)
    const piled = liquidBar({ a: 10, b: 210, cross: 5, r: 3, segments: 12, pile: 1 })
    expect(piled[10]!.r).toBeGreaterThan(piled[1]!.r)
    // The surface (top) rises; the bottom stays put.
    expect(piled[10]!.y + piled[10]!.r).toBeCloseTo(5 + 3)
    expect(piled[10]!.y - piled[10]!.r).toBeLessThan(5 - 3)
    expect(visible(liquidBar({ a: 4, b: 4, cross: 0, r: 3, segments: 5 }))).toHaveLength(0)
    const v = liquidBar({ a: 0, b: 100, cross: 6, r: 2, segments: 4, vertical: true })
    expect(v.every((c) => c.x === 6 && c.sy > 1)).toBe(true)
  })

  it('hangingDrip: grows out of the anchor, neck pinches off at u = 1', () => {
    const early = hangingDrip(0.1, 0, 0, 4, 2, 2)
    const late = hangingDrip(1, 0, 0, 4, 2, 2)
    expect(early).toHaveLength(3)
    expect(late[0]!.y).toBeGreaterThan(early[0]!.y)
    expect(late[0]!.r).toBeCloseTo(2)
    expect(late[1]!.r).toBe(0)
  })
})

const G = { vertical: false, thumbR: 6, trackR: 2 }

describe('slider pose', () => {
  it('a resting thumb is round with no tail; speed stretches it along the travel', () => {
    const [head, tail] = sliderThumbCircles({ pos: 50, cross: 6, vel: 0, q: 0 }, G)
    expect(head).toMatchObject({ x: 50, y: 6, r: 6, sx: 1, sy: 1 })
    expect(tail!.r).toBe(0)
    const [fast, ftail] = sliderThumbCircles({ pos: 50, cross: 6, vel: 900, q: 0 }, G)
    expect(fast!.sx).toBeGreaterThan(1)
    expect(fast!.sy).toBeLessThan(1)
    expect(ftail!.x).toBeLessThan(50)
    const [left, ltail] = sliderThumbCircles({ pos: 50, cross: 6, vel: -900, q: 0 }, G)
    expect(left!.sx).toBeCloseTo(fast!.sx)
    expect(ltail!.x).toBeGreaterThan(50)
    // Vertical: the stretch is along y.
    const [v] = sliderThumbCircles({ pos: 50, cross: 6, vel: 900, q: 0 }, { ...G, vertical: true })
    expect(v).toMatchObject({ x: 6, y: 50 })
    expect(v!.sy).toBeGreaterThan(1)
  })

  it('stretch=0 keeps it round; a splat flattens along and bulges across', () => {
    expect(sliderThumbDeform(900, 0, 6, SLIDER_FEEL.playful, { jelly: 1, slosh: 1, stretch: 0, splat: 1 })).toMatchObject({ k: 0, along: 1, across: 1 })
    const d = sliderThumbDeform(0, 0.5, 6)
    expect(d.along).toBeLessThan(1)
    expect(d.across).toBeGreaterThan(1)
  })

  it('pose: fill segments + 2 circles per thumb; a range fill spans both thumbs', () => {
    const pose = sliderPose(
      { thumbs: [{ pos: 40, cross: 6, vel: 0, q: 0 }, { pos: 160, cross: 6, vel: 0, q: 0 }], fill: { a: 40, b: 160, cross: 6 } },
      G,
    )
    expect(pose.fill).toHaveLength(SLIDER_FILL_SEGMENTS)
    expect(pose.thumbs).toHaveLength(4)
    expect(Math.min(...pose.fill.map((c) => c.x - c.r * c.sx))).toBeCloseTo(40)
    expect(visible(sliderPose({ thumbs: [], fill: null }, G).fill)).toHaveLength(0)
  })

  it('slosh=0 ignores the surface state', () => {
    const slosh = { x: 1, v: 0, phase: 1 }
    const input = { thumbs: [], fill: { a: 0, b: 200, cross: 6 }, slosh }
    const off = sliderPose(input, G, SLIDER_FEEL.playful, { jelly: 1, slosh: 0, stretch: 1, splat: 1 })
    expect(new Set(off.fill.map((c) => c.r)).size).toBe(1)
    const on = sliderPose(input, G)
    expect(new Set(on.fill.map((c) => c.r)).size).toBeGreaterThan(1)
  })

  it('jelly springs: underdamped with jelly (overshoots), critically damped without', () => {
    const run = (jelly: number) => {
      const s = { x: 0, v: 0 }
      let max = 0
      for (let i = 0; i < 120; i++) {
        stepSpring(s, 100, sliderSpring(jelly), 1 / 60)
        max = Math.max(max, s.x)
      }
      return { max, end: s.x }
    }
    expect(run(1).max).toBeGreaterThan(105)
    expect(run(0).max).toBeLessThanOrEqual(100.0001)
    expect(run(1).end).toBeCloseTo(100, 1)
  })
})

describe('attachSlider', () => {
  const make = () => {
    const root = document.createElement('span')
    root.innerHTML =
      '<span data-slot="slider-track"><span data-slot="slider-range"></span></span><span data-slot="slider-thumb"></span><span data-slot="slider-thumb"></span>'
    document.body.append(root)
    return root
  }

  it('one goo layer above the track with fill + thumb blobs; destroy cleans up', () => {
    const root = make()
    const h = attachSlider(root)
    const layer = root.querySelector<HTMLElement>(`[${GOOP_PART_ATTR}="layer"]`)!
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.style.zIndex).toBe('0')
    expect(root.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(SLIDER_FILL_SEGMENTS + 4)
    expect(h.pose!.thumbs).toHaveLength(4)
    h.destroy()
    expect(root.querySelector(`[${GOOP_PART_ATTR}="layer"]`)).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: static, nothing ticks', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const root = make()
    const h = attachSlider(root)
    expect(h.reducedMotion).toBe(true)
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(h.running).toBe(false)
    h.destroy()
  })
})

const PG = { width: 200, height: 4 }

describe('progress pose', () => {
  it('fills from 0 to the front, with a rounded front at the leading edge', () => {
    const p = progressPose({ a: 0, b: 120, vel: 0, bulge: 0 }, PG)
    expect(p.fill).toHaveLength(PROGRESS_FILL_SEGMENTS)
    expect(Math.max(...p.fill.map((c) => c.x + c.r * c.sx))).toBeCloseTo(120)
    expect(p.front.r).toBeGreaterThan(2.35)
    expect(p.front.x).toBeLessThan(120)
    expect(p.front.x + p.front.r * p.front.sx).toBeGreaterThan(118)
    expect(visible(p.drips)).toHaveLength(0)
    const empty = progressPose({ a: 0, b: 0, vel: 0, bulge: 0 }, PG)
    expect(visible([...empty.fill, empty.front])).toHaveLength(0)
  })

  it('the front bulges with a wobble and stretches with speed', () => {
    const rest = progressPose({ a: 0, b: 120, vel: 0, bulge: 0 }, PG).front
    const bulged = progressPose({ a: 0, b: 120, vel: 0, bulge: 2 }, PG).front
    const fast = progressPose({ a: 0, b: 120, vel: 600, bulge: 0 }, PG).front
    expect(bulged.sx).toBeGreaterThan(rest.sx)
    expect(bulged.sy).toBeGreaterThan(rest.sy)
    expect(fast.sx).toBeGreaterThan(rest.sx)
  })

  it('drips hang from the front underside, then fall from where they let go; drips=0 hides them', () => {
    const hang = progressPose({ a: 0, b: 120, vel: 0, bulge: 0, drips: [{ k: 0, age: 0.4 }] }, PG)
    const d = visible(hang.drips)
    expect(d.length).toBeGreaterThan(0)
    expect(d[0]!.y).toBeGreaterThan(hang.front.y)
    expect(hang.releases.get(0)).toBeDefined()
    const rel = { x: 110, y: 6 }
    const falling = progressPose({ a: 0, b: 120, vel: 0, bulge: 0, drips: [{ k: 0, age: 0.7, release: rel }] }, PG)
    expect(falling.drips[0]!.x).toBe(110)
    expect(falling.drips[0]!.y).toBeGreaterThan(6)
    const off = progressPose({ a: 0, b: 120, vel: 0, bulge: 0, drips: [{ k: 0, age: 0.4 }] }, PG, PROGRESS_FEEL.playful, { slosh: 1, drips: 0, wobble: 1 })
    expect(visible(off.drips)).toHaveLength(0)
  })

  it('drip schedule is seeded and varied', () => {
    const a = progressDripStarts(1, PROGRESS_FEEL.playful, 6)
    expect(progressDripStarts(1, PROGRESS_FEEL.playful, 6)).toEqual(a)
    expect(progressDripStarts(2, PROGRESS_FEEL.playful, 6)).not.toEqual(a)
    const gaps = a.slice(1).map((t, i) => t - a[i]!)
    expect(new Set(gaps.map((g) => g.toFixed(3))).size).toBeGreaterThan(1)
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(PROGRESS_FEEL.playful.dripGap[0])
      expect(g).toBeLessThanOrEqual(PROGRESS_FEEL.playful.dripGap[1])
    }
  })

  it('indeterminate slug runs left to right, never stops', () => {
    const p = PROGRESS_FEEL.playful.period
    const xs = Array.from({ length: 10 }, (_, i) => progressSlug((p * i) / 10, PG))
    for (let i = 1; i < xs.length; i++) expect(xs[i]!.b).toBeGreaterThan(xs[i - 1]!.b)
    expect(xs.every((s) => s.vel > 0)).toBe(true)
    expect(xs[0]!.b).toBeLessThan(10)
  })
})

describe('attachProgress', () => {
  it('draws one layer of PROGRESS_CIRCLES blobs, opens overflow, restores on destroy', () => {
    const root = document.createElement('div')
    root.style.overflow = 'hidden'
    document.body.append(root)
    const h = attachProgress(root, { value: 40 })
    expect(root.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(PROGRESS_CIRCLES)
    expect(root.style.overflow).toBe('visible')
    h.update({ value: 80 })
    expect(h.running).toBe(true)
    h.destroy()
    expect(root.style.overflow).toBe('hidden')
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: front sits at the value, nothing ticks', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const root = document.createElement('div')
    document.body.append(root)
    const h = attachProgress(root, { value: 50 })
    expect(h.running).toBe(false)
    h.update({ value: 75 })
    expect(h.running).toBe(false)
    const end = Math.max(...h.pose!.fill.map((c) => c.x + c.r * c.sx))
    expect(end).toBeCloseTo(75) // 100px fallback width
    h.update({ value: null })
    expect(h.running).toBe(false)
    h.destroy()
  })
})

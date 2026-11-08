// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import {
  SIDEBAR_EDGE_FEEL,
  SIDEBAR_EFFECTS,
  SIDEBAR_PLAIN_CURVE,
  attachSidebarEdge,
  attachSidebarHighlight,
  createSidebarEdge,
  kickSidebarEdge,
  sidebarEdgeBulge,
  sidebarEdgeCircles,
  sidebarEdgeSettled,
  sidebarMotionCurve,
  sidebarRandom,
  sidebarSloshShape,
  stepSidebarEdge,
} from '../src'

const DT = 1 / 60
const feel = SIDEBAR_EDGE_FEEL.playful

/** Simulate an edge moving at `v` px/s (outward +) for `moving` s, then stopping. */
function simulate(v: number, moving: number, total: number, slosh = 1, seed = 3) {
  const edge = createSidebarEdge(28, sidebarRandom(seed))
  let vel = 0
  const peaks: number[] = []
  for (let t = 0; t < total; t += DT) {
    const now = t < moving ? v : 0
    kickSidebarEdge(edge, now - vel, feel, slosh)
    vel = now
    stepSidebarEdge(edge, DT, feel, now, slosh)
    peaks.push(sidebarEdgeBulge(edge))
  }
  return { edge, peaks }
}

describe('sidebar slosh shape', () => {
  it('lists every toggle', () => {
    expect([...SIDEBAR_EFFECTS]).toEqual(['highlight', 'pill', 'slosh', 'travel', 'submenus', 'pour', 'tooltips', 'drawer', 'bloom'])
  })

  it('is low and wide: most of the edge moves, the ends stay put', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = sidebarSloshShape(40, sidebarRandom(seed))
      expect(Math.max(...s)).toBeCloseTo(1)
      expect(s[0]).toBeLessThan(0.05)
      expect(s[39]).toBeLessThan(0.05)
      // Wide: at least a quarter of the columns are above half height.
      expect(s.filter((v) => v > 0.5).length).toBeGreaterThanOrEqual(10)
    }
  })

  it('varies between motions (not always centred)', () => {
    const peaks = new Set<number>()
    for (let seed = 1; seed < 20; seed++) {
      const s = sidebarSloshShape(40, sidebarRandom(seed))
      peaks.add(s.indexOf(Math.max(...s)))
    }
    expect(peaks.size).toBeGreaterThan(4)
  })
})

describe('sidebar edge sim', () => {
  it('a collapse (edge moving inward) bulges out while it travels, then settles', () => {
    const { edge, peaks } = simulate(-1040, 0.2, 3)
    const during = Math.max(...peaks.slice(0, 12))
    expect(during).toBeGreaterThan(3)
    expect(Math.max(...peaks)).toBeLessThanOrEqual(feel.bulge + 0.01)
    expect(sidebarEdgeSettled(edge, 0.3)).toBe(true)
  })

  it('an expand lands with an outward overshoot after it stops', () => {
    const { peaks } = simulate(1040, 0.2, 2)
    const before = Math.max(...peaks.slice(0, 11))
    const after = Math.max(...peaks.slice(12, 60))
    expect(after).toBeGreaterThan(3)
    expect(after).toBeGreaterThan(before)
  })

  it('slosh 0 never bulges; strength scales it', () => {
    expect(Math.max(...simulate(-1040, 0.2, 1, 0).peaks)).toBe(0)
    const weak = Math.max(...simulate(-1040, 0.2, 1, 0.5).peaks)
    const strong = Math.max(...simulate(-1040, 0.2, 1, 1).peaks)
    expect(strong).toBeGreaterThan(weak)
  })

  it('draws nothing at rest and only outward mounds past the inner edge', () => {
    const edge = createSidebarEdge(20, sidebarRandom(1))
    expect(sidebarEdgeCircles(edge, 'left', 800, 14).every((c) => c.r === 0)).toBe(true)
    edge.d = edge.d.map((_, i) => (i === 10 ? 8 : 0))
    const left = sidebarEdgeCircles(edge, 'left', 800, 14).filter((c) => c.r > 0)
    expect(left.length).toBeGreaterThan(0)
    // Reaches at most d past the edge (x + r <= d), on the outward side.
    for (const c of left) expect(c.x + c.r).toBeLessThanOrEqual(8.01)
    const right = sidebarEdgeCircles(edge, 'right', 800, 14).filter((c) => c.r > 0)
    for (const c of right) expect(c.x - c.r).toBeGreaterThanOrEqual(-8.01)
  })
})

describe('attachSidebarEdge', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('inserts an aria-hidden edge element and cleans up', () => {
    const panel = document.createElement('div')
    document.body.append(panel)
    const h = attachSidebarEdge(panel, { seed: 1 })
    expect(h.element.getAttribute('data-goop')).toBe('sidebar-edge')
    expect(h.element.getAttribute('aria-hidden')).toBe('true')
    expect(panel.style.isolation).toBe('isolate')
    expect(h.bulge).toBe(0)
    h.destroy()
    expect(panel.querySelector('[data-goop="sidebar-edge"]')).toBeNull()
    expect(panel.style.isolation).toBe('')
  })

  it('reduced motion: tracking does nothing', () => {
    const panel = document.createElement('div')
    document.body.append(panel)
    const h = attachSidebarEdge(panel, { reducedMotion: true })
    h.track()
    expect(h.reducedMotion).toBe(true)
    expect(h.active).toBe(false)
    h.destroy()
  })
})

describe('attachSidebarHighlight', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('marks the hovered menu button and the blob follows it', () => {
    const panel = document.createElement('div')
    panel.innerHTML = `<ul><li><button data-sidebar="menu-button" id="a">A</button></li><li><button data-sidebar="menu-button" id="b">B</button></li><li><button data-sidebar="menu-button" id="c" disabled>C</button></li></ul>`
    document.body.append(panel)
    const h = attachSidebarHighlight(panel, { reducedMotion: true })
    const b = panel.querySelector('#b')!
    b.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(b.hasAttribute('data-highlighted')).toBe(true)
    h.refresh()
    expect(h.target).toBe(b)
    const c = panel.querySelector('#c')!
    c.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(c.hasAttribute('data-highlighted')).toBe(false)
    panel.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    expect(panel.querySelector('[data-highlighted]')).toBeNull()
    h.destroy()
    expect(panel.querySelector('[data-goop="highlight"]')).toBeNull()
  })
})

describe('sidebarMotionCurve', () => {
  const pts = (easing: string) => easing.replace(/^linear\(|\)$/g, '').split(',').map(Number)

  it('expands with a fast launch and a small landing overshoot', () => {
    const c = sidebarMotionCurve({ distance: 208, opening: true })
    expect(c.easing.startsWith('linear(')).toBe(true)
    const p = pts(c.easing)
    expect(p[0]).toBe(0)
    expect(p[p.length - 1]).toBe(1)
    const peak = Math.max(...p)
    // Overshoots a few % of the travel, never a big bounce.
    expect(peak).toBeGreaterThan(1.01)
    expect(peak).toBeLessThan(1.1)
    // Fast travel: it reaches the target in the first two thirds; the rest is the landing.
    expect(p.findIndex((v) => v >= 1)).toBeLessThan(p.length * 0.67)
    expect(c.duration).toBeGreaterThan(0.2)
    expect(c.duration).toBeLessThan(1.2)
  })

  it('collapses by accelerating away and never overshoots', () => {
    const p = pts(sidebarMotionCurve({ distance: 208, opening: false }).easing)
    expect(Math.max(...p)).toBeLessThanOrEqual(1)
    // Starts slowly, ends fast: the last step is the biggest.
    const first = p[1]! - p[0]!
    const last = p[p.length - 1]! - p[p.length - 2]!
    expect(last).toBeGreaterThan(first * 4)
  })

  it('caps the overshoot, scales with speed, and is plain under reduced motion', () => {
    const capped = pts(sidebarMotionCurve({ distance: 256, opening: true, overshootLimit: 0 }).easing)
    expect(Math.max(...capped)).toBeLessThanOrEqual(1.001)
    const a = sidebarMotionCurve({ distance: 208, opening: true })
    const b = sidebarMotionCurve({ distance: 208, opening: true, speed: 2 })
    expect(b.duration).toBeCloseTo(a.duration / 2, 2)
    expect(sidebarMotionCurve({ distance: 208, opening: true, reduced: true })).toEqual(SIDEBAR_PLAIN_CURVE)
    expect(sidebarMotionCurve({ distance: 208, opening: false, linear: false }).easing).toMatch(/^cubic-bezier/)
  })

  it('wild overshoots more than subtle', () => {
    const peak = (preset: 'subtle' | 'wild') => Math.max(...pts(sidebarMotionCurve({ distance: 208, opening: true, preset }).easing))
    expect(peak('wild')).toBeGreaterThan(peak('subtle'))
  })
})

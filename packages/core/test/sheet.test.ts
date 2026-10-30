import { afterEach, describe, expect, it } from 'vitest'
import {
  SHEET_CIRCLES,
  SHEET_CLOSE_VAR,
  SHEET_CONTENT_VAR,
  SHEET_DRIPS,
  SHEET_FEEL,
  SHEET_LOBES,
  SHEET_STATE_ATTR,
  activeTickerCount,
  attachSheet,
  sheetArrival,
  sheetCloseStart,
  sheetDripCount,
  sheetGeometry,
  sheetIdle,
  sheetLobes,
  sheetOpenStart,
  sheetPose,
  sheetRestPose,
  sheetSettleTime,
  sheetTravel,
  type SheetPose,
  type SheetSide,
} from '../src'

const SIDES: SheetSide[] = ['top', 'right', 'bottom', 'left']
const F = SHEET_FEEL.playful
const geomFor = (side: SheetSide) => (side === 'top' || side === 'bottom' ? sheetGeometry(1000, 260, side) : sheetGeometry(384, 800, side))
/** Body extent along the in-flow axis. */
const extent = (side: SheetSide, p: SheetPose) => (side === 'top' || side === 'bottom' ? p.body.h : p.body.w)
const secs = (dur: number) => Array.from({ length: 61 }, (_, i) => (i / 60) * dur)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('sheetTravel', () => {
  it('runs 0 -> 1, overshoots with slosh and settles by the end', () => {
    expect(sheetTravel(0, F)).toBeCloseTo(0)
    expect(sheetTravel(1, F)).toBeCloseTo(1, 1)
    const peak = Math.max(...secs(1).map((u) => sheetTravel(u, F)))
    expect(peak).toBeGreaterThan(1.05)
  })
  it('never overshoots without slosh', () => {
    for (const u of secs(1)) expect(sheetTravel(u, F, false)).toBeLessThanOrEqual(1 + 1e-9)
    expect(sheetTravel(0.8, F, false)).toBeCloseTo(1)
  })
  it('the wilder the preset, the bigger the slosh', () => {
    const peak = (p: keyof typeof SHEET_FEEL) => Math.max(...secs(1).map((u) => sheetTravel(u, SHEET_FEEL[p])))
    expect(peak('wild')).toBeGreaterThan(peak('playful'))
    expect(peak('playful')).toBeGreaterThan(peak('subtle'))
  })
})

describe('sheetPose', () => {
  it('always returns SHEET_CIRCLES circles', () => {
    for (const side of SIDES) for (const s of secs(F.open)) expect(sheetPose(s, geomFor(side), 'open').circles).toHaveLength(SHEET_CIRCLES)
  })

  it('oozes out from the sheet edge on every side and lands on the full sheet', () => {
    for (const side of SIDES) {
      const g = geomFor(side)
      const start = sheetPose(0, g, 'open')
      expect(extent(side, start)).toBe(0)
      expect(start.circles.every((c) => c.r < 1)).toBe(true)
      const end = sheetPose(F.open, g, 'open', F, { drips: false })
      expect(end.body).toEqual(sheetRestPose(g).body)
      // The body is pinned to the viewport edge the sheet comes from.
      const mid = sheetPose(F.open * 0.15, g, 'open')
      const { cx, cy, w, h } = mid.body
      if (side === 'left') expect(cx - w / 2).toBeCloseTo(0)
      if (side === 'right') expect(cx + w / 2).toBeCloseTo(g.width)
      if (side === 'top') expect(cy - h / 2).toBeCloseTo(0)
      if (side === 'bottom') expect(cy + h / 2).toBeCloseTo(g.height)
    }
  })

  it('sloshes past the rest line by at most the preset overshoot (plus lobes)', () => {
    const g = geomFor('right')
    const over = (fx = {}) =>
      Math.max(
        ...secs(F.open).map((s) => {
          const p = sheetPose(s, g, 'open', F, fx)
          return Math.max(...p.circles.filter((c) => c.r > 0).map((c) => g.width - c.x + c.r - g.width), extent('right', p) - g.width)
        }),
      )
    expect(over()).toBeGreaterThan(4)
    expect(over({ lobes: false })).toBeLessThanOrEqual(F.overshoot + 0.5)
    expect(over({ lobes: false, slosh: false })).toBeLessThanOrEqual(0.5)
  })

  it('lobes make an uneven front while moving; off, the front is straight', () => {
    const g = geomFor('left')
    const p = sheetPose(F.open * 0.2, g, 'open')
    const { count } = sheetLobes(g, F)
    const lobes = p.circles.slice(0, count)
    expect(lobes.every((c) => c.r > 0)).toBe(true)
    const tips = lobes.map((c) => c.x + c.r)
    expect(Math.max(...tips) - Math.min(...tips)).toBeGreaterThan(5)
    // Middle leads the corners on the way out.
    expect(tips[Math.floor(count / 2)]!).toBeGreaterThan(tips[0]!)
    const flat = sheetPose(F.open * 0.2, g, 'open', F, { lobes: false })
    expect(flat.circles.slice(0, SHEET_LOBES).every((c) => c.r === 0)).toBe(true)
  })

  it('top sheets grow hanging drips that keep swaying; bottom sheets fling drops that fall back', () => {
    const top = geomFor('top')
    const n = sheetDripCount(top)
    expect(n).toBeGreaterThan(1)
    expect(n).toBeLessThanOrEqual(SHEET_DRIPS)
    const bulbs = (s: number) => sheetPose(s, top, 'open').circles.slice(SHEET_LOBES).filter((c) => c.r > 0)
    expect(bulbs(F.open * 0.1)).toHaveLength(0)
    const late = bulbs(F.open + 2)
    expect(late.length).toBe(n * 3)
    expect(Math.max(...late.map((c) => c.y + c.r))).toBeGreaterThan(top.height + 5)
    // Still moving after the open.
    expect(bulbs(F.open + 2)).not.toEqual(bulbs(F.open + 2.4))
    expect(sheetIdle(top)).toBe(true)
    expect(sheetSettleTime(top, F)).toBe(Infinity)

    const bottom = geomFor('bottom')
    const fling = secs(sheetSettleTime(bottom, F)).flatMap((s) => sheetPose(s, bottom, 'open').circles.slice(SHEET_LOBES))
    // Drops go above the sheet's top edge (y < 0), then are gone once settled.
    expect(Math.min(...fling.filter((c) => c.r > 0).map((c) => c.y))).toBeLessThan(-5)
    expect(sheetPose(sheetSettleTime(bottom, F) + 0.01, bottom, 'open').circles.slice(SHEET_LOBES).every((c) => c.r === 0)).toBe(true)
    expect(sheetIdle(bottom)).toBe(false)
  })

  it('no drips on left / right sheets or with drips off', () => {
    expect(sheetDripCount(geomFor('left'))).toBe(0)
    expect(sheetDripCount(geomFor('right'))).toBe(0)
    const p = sheetPose(F.open + 1, geomFor('top'), 'open', F, { drips: false })
    expect(p.circles.slice(SHEET_LOBES).every((c) => c.r === 0)).toBe(true)
  })

  it('close bulges out first, then gets sucked back into the edge, accelerating', () => {
    for (const side of SIDES) {
      const g = geomFor(side)
      const e = secs(F.close).map((s) => extent(side, sheetPose(s, g, 'close', F, { lobes: false })))
      expect(Math.max(...e.slice(0, 8))).toBeGreaterThan(g.depth)
      expect(e[e.length - 1]).toBe(0)
      // Accelerating: the second half covers more ground than the first.
      const mid = e[30]!
      expect(g.depth - mid).toBeLessThan(mid)
    }
    // suck off: no bulge.
    const g = geomFor('right')
    for (const s of secs(F.close)) expect(extent('right', sheetPose(s, g, 'close', F, { suck: false, lobes: false }))).toBeLessThanOrEqual(g.depth + 1e-6)
  })

  it('fades content in late on open and out first on close; fade off keeps it shown', () => {
    const g = geomFor('right')
    expect(sheetPose(0, g, 'open').content).toBe(0)
    expect(sheetPose(F.open, g, 'open').content).toBe(1)
    expect(sheetPose(F.close * 0.25, g, 'close').content).toBe(0)
    expect(sheetPose(0, g, 'open', F, { fade: false }).content).toBe(1)
  })

  it('reversal starts match the current front', () => {
    const g = geomFor('right')
    expect(sheetCloseStart(g.depth, g)).toBe(0)
    expect(sheetCloseStart(0, g)).toBeCloseTo(1)
    const u = sheetOpenStart(g.depth / 2, g)
    expect(sheetTravel(u, F)).toBeGreaterThanOrEqual(0.5)
    expect(sheetTravel(u - 0.01, F)).toBeLessThan(0.5)
    expect(sheetArrival(F)).toBeLessThan(F.open)
  })
})

describe('attachSheet', () => {
  const host = (w = 384, h = 800, side: SheetSide = 'right') => {
    const el = document.createElement('div')
    el.setAttribute('data-side', side)
    Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w })
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => h })
    el.innerHTML = '<p>content</p>'
    document.body.append(el)
    return el
  }

  it('adds an aria-hidden goo surface with a blob per circle and publishes state vars', () => {
    const el = host()
    const h = attachSheet(el, { renderer: 'svg' })
    const surface = el.querySelector('[data-goop="surface"]')!
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(surface.querySelectorAll('[data-goop="blob"]')).toHaveLength(SHEET_CIRCLES)
    expect(el.getAttribute(SHEET_STATE_ATTR)).toBe('closed')
    expect(el.style.getPropertyValue(SHEET_CONTENT_VAR)).toBe('0')
    h.open()
    expect(h.state).toBe('opening')
    expect(activeTickerCount()).toBeGreaterThan(0)
    // Nothing out yet: closing right away takes no time.
    expect(h.close()).toBe(0)
    // From fully open, the close plays.
    h.update({ reducedMotion: true })
    h.open()
    h.update({ reducedMotion: false })
    expect(h.state).toBe('open')
    const ms = h.close()
    expect(ms).toBeGreaterThan(0)
    expect(el.style.getPropertyValue(SHEET_CLOSE_VAR)).toBe(`${ms}ms`)
    h.destroy()
    expect(el.querySelector('[data-goop="surface"]')).toBeNull()
    expect(el.hasAttribute(SHEET_STATE_ATTR)).toBe(false)
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: opens and closes instantly, no ticker', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = host(1000, 260, 'top')
    const h = attachSheet(el, { renderer: 'svg' })
    h.open()
    expect(h.state).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(el.style.getPropertyValue(SHEET_CONTENT_VAR)).toBe('1')
    expect(activeTickerCount()).toBe(0)
    expect(h.close()).toBe(0)
    expect(h.state).toBe('closed')
    h.destroy()
  })

  it('defaults to the canvas renderer', () => {
    const el = host()
    const h = attachSheet(el)
    expect(el.querySelector('[data-goop="canvas"]')).not.toBeNull()
    h.update({ renderer: 'svg' })
    expect(el.querySelector('[data-goop="canvas"]')).toBeNull()
    h.destroy()
  })
})

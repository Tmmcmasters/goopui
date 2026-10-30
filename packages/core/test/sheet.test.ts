import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DIALOG_FEEL,
  EMERGE_BLOOM_LOBES,
  EMERGE_BULGE_SLOTS,
  EMERGE_CIRCLES,
  EMERGE_CLOSE_VAR,
  EMERGE_CONTENT_VAR,
  EMERGE_STATE_ATTR,
  SHEET_FEEL,
  activeTickerCount,
  attachSheet,
  bloomOrigin,
  emergeBloomDuration,
  emergeDetachedBridge,
  emergeMomentum,
  emergeMomentumEnd,
  emergePose,
  emergeRestPose,
  emergeWalls,
  sheetBloomOrigin,
  type EmergeBridge,
  type EmergeRect,
  type SheetSide,
} from '../src'

const VIEW = { width: 1280, height: 800 }
const SIDES: SheetSide[] = ['top', 'right', 'bottom', 'left']
const F = SHEET_FEEL.playful
const bloom = { flow: true, flowStyle: 'bloom' } as const
const rectFor = (side: SheetSide): EmergeRect =>
  side === 'top'
    ? { x: 0, y: 0, width: VIEW.width, height: 260 }
    : side === 'bottom'
      ? { x: 0, y: VIEW.height - 260, width: VIEW.width, height: 260 }
      : side === 'right'
        ? { x: VIEW.width - 384, y: 0, width: 384, height: VIEW.height }
        : { x: 0, y: 0, width: 384, height: VIEW.height }

/** The bridge attachSheet builds: detached, origin at the edge middle, screen-edge walls. */
const bridgeFor = (side: SheetSide): EmergeBridge => {
  const r = rectFor(side)
  const b = emergeDetachedBridge(r, F)
  const o = sheetBloomOrigin(r, side)
  b.origin = { x: o.x - r.x, y: o.y - r.y }
  b.walls = emergeWalls(r, VIEW)
  return b
}

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('sheet bloom geometry', () => {
  it('starts at the middle of the screen edge', () => {
    expect(sheetBloomOrigin({ x: 0, y: 0, width: 400, height: 800 }, 'left')).toEqual({ x: 0, y: 400 })
    expect(sheetBloomOrigin({ x: 10, y: 0, width: 400, height: 800 }, 'right')).toEqual({ x: 410, y: 400 })
    expect(sheetBloomOrigin({ x: 0, y: 0, width: 1000, height: 300 }, 'top')).toEqual({ x: 500, y: 0 })
    expect(sheetBloomOrigin({ x: 0, y: 500, width: 1000, height: 300 }, 'bottom')).toEqual({ x: 500, y: 800 })
  })

  it('marks the panel edges that lie on the screen edge as walls', () => {
    expect(emergeWalls(rectFor('right'), VIEW)).toEqual(['top', 'right', 'bottom'])
    expect(emergeWalls(rectFor('top'), VIEW)).toEqual(['top', 'right', 'left'])
    expect(emergeWalls({ x: 400, y: 200, width: 400, height: 200 }, VIEW)).toEqual([])
  })

  it.each(SIDES)('%s: the first droplet sits against the screen edge, at its middle', (side) => {
    const b = bridgeFor(side)
    const p = emergePose(0.03, b, 'open', F, bloom)
    const o = bloomOrigin(b)
    expect(p.body.w).toBeGreaterThan(0)
    expect(p.body.w).toBeLessThan(b.width / 3)
    expect(p.body.h).toBeLessThan(b.height / 3)
    const edge = { top: p.body.cy - p.body.h / 2, bottom: p.body.cy + p.body.h / 2 - b.height, left: p.body.cx - p.body.w / 2, right: p.body.cx + p.body.w / 2 - b.width }[side]
    expect(Math.abs(edge)).toBeLessThan(1)
    if (side === 'top' || side === 'bottom') expect(p.body.cx).toBeCloseTo(o.x, 3)
    else expect(p.body.cy).toBeCloseTo(o.y, 3)
  })

  it.each(SIDES)('%s: blooms to the full rect, overshooting the inner edge', (side) => {
    const b = bridgeFor(side)
    const inner = (p: ReturnType<typeof emergePose>) =>
      side === 'right' ? -(p.body.cx - p.body.w / 2) : side === 'left' ? p.body.cx + p.body.w / 2 - b.width : side === 'top' ? p.body.cy + p.body.h / 2 - b.height : -(p.body.cy - p.body.h / 2)
    let over = -Infinity
    for (let t = 0.3; t <= 1; t += 0.01) over = Math.max(over, inner(emergePose(t, b, 'open', F, bloom)))
    expect(over).toBeGreaterThan(5)
    expect(emergePose(1, b, 'open', F, bloom)).toEqual(emergeRestPose(b))
  })

  it.each(SIDES)('%s: close shrinks back into the edge middle', (side) => {
    const b = bridgeFor(side)
    const o = bloomOrigin(b, 20)
    const late = emergePose(0.9, b, 'close', F, bloom)
    expect(late.body.w).toBeLessThan(b.width / 4)
    expect(Math.hypot(late.body.cx - o.x, late.body.cy - o.y)).toBeLessThan(20)
    expect(emergePose(1, b, 'close', F, bloom).body.w).toBe(0)
  })

  it.each(SIDES)('%s: the varied slosh, overshoot and close slosh never push past a screen edge', (side) => {
    const b = bridgeFor(side)
    const walls = b.walls ?? []
    for (let seed = 1; seed <= 6; seed++) {
      for (const phase of ['open', 'close'] as const) {
        const dur = phase === 'open' ? emergeMomentumEnd('open') : emergeBloomDuration(F, 'close')
        for (let sec = 0; sec < dur; sec += 0.015) {
          const t = sec / emergeBloomDuration(F, phase)
          const base = phase === 'open' && t >= 1 ? emergeRestPose(b) : emergePose(t, b, phase, F, bloom, seed)
          const p = emergeMomentum(base, b, phase, sec, { openDrips: false }, { bloom: true, seed })
          const boxes = [
            // The slosh lumps: the close's (in the pose) and the open's (momentum).
            ...[...p.circles.slice(EMERGE_BLOOM_LOBES, EMERGE_BLOOM_LOBES + EMERGE_BULGE_SLOTS), ...p.circles.slice(EMERGE_CIRCLES, EMERGE_CIRCLES + EMERGE_BULGE_SLOTS)]
              .filter((c) => c.r > 0)
              .map((c) => ({ x0: c.x - c.r, y0: c.y - c.r, x1: c.x + c.r, y1: c.y + c.r })),
            ...(p.body.w > 0 ? [{ x0: p.body.cx - p.body.w / 2, y0: p.body.cy - p.body.h / 2, x1: p.body.cx + p.body.w / 2, y1: p.body.cy + p.body.h / 2 }] : []),
          ]
          for (const k of boxes) {
            if (walls.includes('top')) expect(k.y0).toBeGreaterThan(-0.5)
            if (walls.includes('left')) expect(k.x0).toBeGreaterThan(-0.5)
            if (walls.includes('bottom')) expect(k.y1).toBeLessThan(b.height + 0.5)
            if (walls.includes('right')) expect(k.x1).toBeLessThan(b.width + 0.5)
          }
        }
      }
    }
  })

  it.each(SIDES)('%s: the splash never flies off the screen edge, and lands on-screen', (side) => {
    const b = bridgeFor(side)
    const rest = emergeRestPose(b)
    let drops = 0
    for (let seed = 0; seed < 4; seed++) {
      for (let sec = 0; sec < emergeMomentumEnd('open'); sec += 0.02) {
        const p = emergeMomentum(rest, b, 'open', sec, { openSlosh: false }, { bloom: true, seed, splash: F.bloomSplash })
        for (const c of p.circles.slice(EMERGE_CIRCLES)) {
          if (c.r <= 0) continue
          drops++
          // Panel-local -> viewport.
          const x = c.x + rectFor(side).x
          const y = c.y + rectFor(side).y
          if (side === 'right') expect(x).toBeLessThan(VIEW.width + 1)
          if (side === 'left') expect(x).toBeGreaterThan(-1)
          if (side === 'top') expect(y).toBeGreaterThan(-1)
          if (side === 'bottom') expect(y).toBeLessThan(VIEW.height + 1)
        }
      }
    }
    expect(drops).toBeGreaterThan(50)
  })

  it('is a bigger, slower bloom than the dialog with a short close', () => {
    expect(emergeBloomDuration(F, 'open')).toBeGreaterThan(emergeBloomDuration(DIALOG_FEEL.playful, 'open'))
    expect(emergeBloomDuration(F, 'close')).toBeLessThanOrEqual(0.34)
    expect(F.bloomOvershoot!).toBeGreaterThan(DIALOG_FEEL.playful.bloomOvershoot!)
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

  it('blooms with the emerge engine, then stops ticking (no idle drips)', () => {
    vi.useFakeTimers()
    try {
      const el = host()
      const h = attachSheet(el, { renderer: 'svg' })
      const surface = el.querySelector('[data-goop="surface"]')!
      expect(surface.getAttribute('aria-hidden')).toBe('true')
      expect(el.getAttribute(EMERGE_STATE_ATTR)).toBe('closed')
      expect(el.style.getPropertyValue(EMERGE_CONTENT_VAR)).toBe('0')
      h.open()
      expect(h.state).toBe('opening')
      expect(activeTickerCount()).toBeGreaterThan(0)
      vi.advanceTimersByTime(4000)
      expect(h.state).toBe('open')
      expect(activeTickerCount()).toBe(0)
      expect(el.style.getPropertyValue(EMERGE_CONTENT_VAR)).toBe('1')
      const ms = h.close()
      expect(ms).toBe(Math.round(emergeBloomDuration(F, 'close') * 1000))
      expect(el.style.getPropertyValue(EMERGE_CLOSE_VAR)).toBe(`${ms}ms`)
      vi.advanceTimersByTime(2000)
      expect(h.state).toBe('closed')
      h.destroy()
      expect(el.querySelector('[data-goop="surface"]')).toBeNull()
      expect(el.hasAttribute(EMERGE_STATE_ATTR)).toBe(false)
      expect(activeTickerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reduced motion: opens and closes instantly, no ticker', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = host(1000, 260, 'top')
    const h = attachSheet(el, { renderer: 'svg' })
    h.open()
    expect(h.state).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(el.style.getPropertyValue(EMERGE_CONTENT_VAR)).toBe('1')
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

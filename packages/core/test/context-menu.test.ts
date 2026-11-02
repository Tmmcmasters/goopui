import { afterEach, describe, expect, it } from 'vitest'
import {
  EMERGE_FEEL,
  attachContextPoint,
  attachEmerge,
  contextMenuBloomOrigin,
  emergeBridge,
  emergeDetachedBridge,
  emergePose,
  emergeRestPose,
  type EmergeRect,
} from '../src'

const bloom = { flow: true, flowStyle: 'bloom' } as const

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const rect = (r: EmergeRect) => () =>
  ({ left: r.x, top: r.y, width: r.width, height: r.height, x: r.x, y: r.y, right: r.x + r.width, bottom: r.y + r.height, toJSON() {} }) as DOMRect

describe('attachContextPoint', () => {
  it('records the contextmenu point and touch / pen presses, not mouse presses', () => {
    const area = document.createElement('div')
    document.body.append(area)
    const h = attachContextPoint(area)
    expect(h.point()).toBeNull()
    area.dispatchEvent(new MouseEvent('contextmenu', { clientX: 120, clientY: 80, bubbles: true }))
    expect(h.point()).toEqual({ x: 120, y: 80 })
    const down = (pointerType: string, x: number) => {
      const e = new MouseEvent('pointerdown', { clientX: x, clientY: 10, bubbles: true })
      Object.defineProperty(e, 'pointerType', { value: pointerType })
      area.dispatchEvent(e)
    }
    down('mouse', 5)
    expect(h.point()).toEqual({ x: 120, y: 80 })
    down('touch', 33)
    expect(h.point()).toEqual({ x: 33, y: 10 })
    h.clear()
    expect(h.point()).toBeNull()
    h.destroy()
    area.dispatchEvent(new MouseEvent('contextmenu', { clientX: 1, clientY: 2, bubbles: true }))
    expect(h.point()).toBeNull()
  })

  it('records events from descendants (capture) and is safe without a target', () => {
    const area = document.createElement('div')
    const child = document.createElement('span')
    area.append(child)
    document.body.append(area)
    const h = attachContextPoint(area)
    child.dispatchEvent(new MouseEvent('contextmenu', { clientX: 7, clientY: 9, bubbles: true }))
    expect(h.point()).toEqual({ x: 7, y: 9 })
    h.destroy()
    const none = attachContextPoint(null)
    expect(none.point()).toBeNull()
    expect(() => none.destroy()).not.toThrow()
  })

  it('contextMenuBloomOrigin: the point for pointer, the center for center', () => {
    expect(contextMenuBloomOrigin('pointer', { x: 1, y: 2 })).toEqual({ x: 1, y: 2 })
    expect(contextMenuBloomOrigin(undefined, { x: 1, y: 2 })).toEqual({ x: 1, y: 2 })
    expect(contextMenuBloomOrigin('center', { x: 1, y: 2 })).toBeNull()
    expect(contextMenuBloomOrigin('pointer', null)).toBeNull()
  })
})

describe('context menu bloom (detached, from the pointer)', () => {
  const panel: EmergeRect = { x: 302, y: 200, width: 220, height: 180 }

  it('grows out of the pointer corner, stays inside, ends at rest, shrinks back to it', () => {
    // reka puts the menu just right of the pointer, its top at the pointer.
    const b = { ...emergeDetachedBridge(panel), origin: { x: 300 - panel.x, y: 200 - panel.y } }
    const first = emergePose(0.02, b, 'open', EMERGE_FEEL.playful, { ...bloom, wobble: false })
    expect(first.body.cx).toBeLessThan(40)
    expect(first.body.cy).toBeLessThan(40)
    for (let i = 1; i <= 40; i++) {
      const p = emergePose(i / 40, b, 'open', EMERGE_FEEL.playful, { ...bloom, wobble: false })
      if (p.body.w <= 0) continue
      expect(p.body.cx - p.body.w / 2).toBeGreaterThanOrEqual(-1e-6)
      expect(p.body.cy - p.body.h / 2).toBeGreaterThanOrEqual(-1e-6)
    }
    expect(emergePose(1, b, 'open', EMERGE_FEEL.playful, bloom)).toEqual(emergeRestPose(b))
    const late = emergePose(0.8, b, 'close', EMERGE_FEEL.playful, bloom).body
    expect(late.cx).toBeLessThan(panel.width / 2)
    expect(late.cy).toBeLessThan(panel.height / 2)
  })

  it('a menu flipped up-left of the pointer grows from its bottom-right corner', () => {
    const b = { ...emergeDetachedBridge(panel), origin: { x: panel.width + 2, y: panel.height } }
    const first = emergePose(0.02, b, 'open', EMERGE_FEEL.playful, { ...bloom, wobble: false })
    expect(first.body.cx).toBeGreaterThan(panel.width - 40)
    expect(first.body.cy).toBeGreaterThan(panel.height - 40)
  })

  it('attachEmerge (detached) reads the point each frame', () => {
    const host = document.createElement('div')
    document.body.append(host)
    host.getBoundingClientRect = rect(panel)
    let calls = 0
    const h = attachEmerge(host, { detached: true, bloomOrigin: () => (calls++, { x: 300, y: 200 }) })
    h.open()
    expect(calls).toBeGreaterThan(0)
    expect(host.hasAttribute('data-goop-emerge')).toBe(true)
    h.destroy()
  })
})

describe('hover card bloom (from the trigger)', () => {
  it('a trigger above the card clamps onto the card top edge', () => {
    const trigger: EmergeRect = { x: 400, y: 100, width: 80, height: 20 }
    const card: EmergeRect = { x: 312, y: 124, width: 256, height: 140 }
    const b = { ...emergeBridge(trigger, card, 'bottom'), origin: { x: 440 - card.x, y: 110 - card.y } }
    const first = emergePose(0.02, b, 'open', EMERGE_FEEL.playful, { ...bloom, wobble: false })
    expect(first.body.cy).toBeLessThan(30)
    expect(Math.abs(first.body.cx - 128)).toBeLessThan(5)
  })
})

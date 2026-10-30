import { afterEach, describe, expect, it } from 'vitest'
import { createSvgFilterRenderer, createCanvasRenderer } from '../src'
import { PAGE_EDGE_MARGIN, pageEdgeLimit, pageEdgeWatchCount } from '../src/page-edge'

const PARAMS = { blur: 4, contrast: 20, threshold: 0.4 }
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** happy-dom has no layout: fake the host and page geometry. */
function place(el: Element, r: { left: number; top: number; width: number; height: number }): void {
  const rect = { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => ({}) }
  ;(el as HTMLElement).getBoundingClientRect = () => rect as DOMRect
}

function makeHost(left: number, top: number, w = 100, h = 40): HTMLButtonElement {
  const el = document.createElement('button')
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w })
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => h })
  Object.defineProperty(el, 'offsetParent', { configurable: true, get: () => document.body })
  place(el, { left, top, width: w, height: h })
  document.body.append(el)
  return el
}

function page(w: number, h: number): void {
  place(document.documentElement, { left: 0, top: 0, width: w, height: h })
  place(document.body, { left: 0, top: 0, width: w, height: h })
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => w })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, get: () => h })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('pageEdgeLimit', () => {
  it('leaves goo free when its reach (plus margin) fits inside the page', () => {
    expect(pageEdgeLimit(100, 50, 1000)).toBeNull()
    expect(pageEdgeLimit(100, 50, 100 + 50 + PAGE_EDGE_MARGIN)).toBeNull()
    expect(pageEdgeLimit(100, 0, 100)).toBeNull()
  })
  it('caps the reach at the page edge (inside the host when it pokes past)', () => {
    expect(pageEdgeLimit(990, 50, 1000)).toBe(10)
    expect(pageEdgeLimit(1010, 50, 1000)).toBe(-10)
    // Near (within the margin) but the visible reach fits: clip at the reach.
    expect(pageEdgeLimit(800, 50, 1000)).toBe(50)
    expect(pageEdgeLimit(800, 50, 1000, 0)).toBeNull()
  })
})

describe('page edge guard', () => {
  it('cuts an SVG layer back to the page edge and clips it; frees it away from the edge', async () => {
    page(1000, 700)
    const host = makeHost(890, 650)
    const r = createSvgFilterRenderer(host, PARAMS)
    r.setPadding({ side: 30, bottom: 80 })
    await frame()
    await frame()
    const layer = r.layer
    expect(layer.style.overflowX).toBe('clip')
    expect(layer.style.overflowY).toBe('clip')
    // Clip edge (box + overflow-clip-margin, or the box alone without support) <= page edge.
    const m = parseFloat(layer.style.overflowClipMargin || '0')
    expect(990 - parseFloat(layer.style.right) + m).toBeLessThanOrEqual(1000)
    expect(690 - parseFloat(layer.style.bottom) + m).toBeLessThanOrEqual(700)
    expect(layer.style.borderRadius).toBe('0px')

    // Page grows (content resize): the layer is free again, back to inheriting its corners.
    page(3000, 3000)
    r.setPadding({ side: 30, bottom: 80 })
    await frame()
    await frame()
    expect(layer.style.overflowX).toBe('')
    expect(layer.style.overflowY).toBe('')
    expect(layer.style.right).toBe('-30px')
    expect(layer.style.bottom).toBe('-80px')
    expect(layer.style.borderRadius).toBe('inherit')
    r.destroy()
    expect(pageEdgeWatchCount(document)).toBe(0)
  })

  it('cuts a canvas layer but keeps the canvas at full size', async () => {
    page(1000, 700)
    const host = makeHost(890, 650)
    const r = createCanvasRenderer(host, PARAMS)
    r.setPadding({ side: 30, bottom: 80 })
    await frame()
    await frame()
    const layer = r.layer
    expect(layer.style.right).toBe('-10px')
    expect(layer.style.bottom).toBe('-10px')
    expect(layer.style.overflowX).toBe('clip')
    const canvas = layer.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.style.width).toBe('160px')
    expect(canvas.style.height).toBe('150px')
    r.destroy()
    expect(pageEdgeWatchCount(document)).toBe(0)
  })

  it('leaves layers in a fixed subtree alone', async () => {
    page(1000, 700)
    const fixed = document.createElement('div')
    fixed.style.position = 'fixed'
    document.body.append(fixed)
    const host = makeHost(890, 650)
    fixed.append(host)
    Object.defineProperty(host, 'offsetParent', { configurable: true, get: () => fixed })
    Object.defineProperty(fixed, 'offsetParent', { configurable: true, get: () => null })
    const r = createSvgFilterRenderer(host, PARAMS)
    r.setPadding({ side: 30, bottom: 80 })
    await frame()
    await frame()
    expect(r.layer.style.overflowX).toBe('')
    expect(r.layer.style.right).toBe('-30px')
    r.destroy()
  })
})

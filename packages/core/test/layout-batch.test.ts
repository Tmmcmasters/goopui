import { afterEach, describe, expect, it } from 'vitest'
import {
  RESIZABLE_EFFECTS,
  RESIZABLE_FEEL,
  RESIZABLE_GRIP_ATTR,
  SCROLL_AREA_EFFECTS,
  SCROLL_AREA_FEEL,
  SCROLL_ROOT_ATTR,
  SCROLL_THUMB_ATTR,
  SCROLL_VIEWPORT_ATTR,
  activeTickerCount,
  attachResizableHandle,
  attachScrollArea,
  isResizableDragging,
  resizableBeadPath,
  scrollSquash,
  scrollStretch,
  scrollThumbTransform,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const frames = (n: number) => new Promise((r) => setTimeout(r, n * 17))

describe('scroll area shape', () => {
  it('stretch grows with speed, capped low, and scales by strength', () => {
    const f = SCROLL_AREA_FEEL.playful
    expect(scrollStretch(0, f)).toBe(0)
    expect(scrollStretch(1, f)).toBeCloseTo(f.gain)
    expect(scrollStretch(-1, f)).toBeCloseTo(f.gain)
    expect(scrollStretch(1e6, f)).toBeCloseTo(f.max)
    expect(scrollStretch(1, f, 0)).toBe(0)
    expect(scrollStretch(Number.NaN, f)).toBe(0)
    expect(SCROLL_AREA_FEEL.wild.max).toBeGreaterThan(SCROLL_AREA_FEEL.subtle.max)
    expect([...SCROLL_AREA_EFFECTS]).toEqual(['stretch', 'jelly'])
  })

  it('squash is negative, saturates softly, never flattens the thumb', () => {
    const f = SCROLL_AREA_FEEL.playful
    expect(scrollSquash(0, f)).toBeCloseTo(0)
    expect(scrollSquash(0.1, f)).toBeLessThan(0)
    expect(scrollSquash(0.3, f)).toBeLessThan(scrollSquash(0.1, f))
    expect(scrollSquash(1e6, f)).toBeGreaterThanOrEqual(-f.squash - 1e-9)
    expect(scrollSquash(1, f, 0)).toBe(0)
  })

  it('scales about the leading end, thinner while stretched, bounded across', () => {
    expect(scrollThumbTransform('y', 0.1, 1)).toEqual({ transform: 'scale(0.965, 1.1)', origin: '50% 100%' })
    expect(scrollThumbTransform('y', 0.1, -1).origin).toBe('50% 0%')
    expect(scrollThumbTransform('x', 0.1, 1)).toEqual({ transform: 'scale(1.1, 0.965)', origin: '100% 50%' })
    // A big squash widens at most a few percent (stays inside the scrollbar's padding).
    expect(scrollThumbTransform('y', -0.9, 1).transform).toBe('scale(1.06, 0.5)')
  })
})

describe('attachScrollArea', () => {
  const area = () => {
    const root = document.createElement('div')
    const viewport = document.createElement('div')
    viewport.setAttribute(SCROLL_VIEWPORT_ATTR, '')
    const bar = document.createElement('div')
    bar.setAttribute('data-orientation', 'vertical')
    const thumb = document.createElement('div')
    const body = document.createElement('span')
    body.setAttribute(SCROLL_THUMB_ATTR, '')
    thumb.append(body)
    bar.append(thumb)
    root.append(viewport, bar)
    document.body.append(root)
    let top = 0
    Object.defineProperty(viewport, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(viewport, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(viewport, 'scrollTop', { get: () => top, set: (v) => (top = v), configurable: true })
    const scrollTo = (v: number) => {
      top = v
      viewport.dispatchEvent(new Event('scroll'))
    }
    return { root, viewport, body, scrollTo }
  }

  it('marks its root, stretches the thumb while scrolling, then rests and clears', async () => {
    const { root, body, scrollTo } = area()
    const h = attachScrollArea(root)
    expect(root.hasAttribute(SCROLL_ROOT_ATTR)).toBe(true)
    for (let i = 1; i <= 4; i++) {
      scrollTo(i * 60)
      await frames(1)
    }
    expect(h.stretch.y).toBeGreaterThan(0)
    expect(body.style.transform).toContain('scale')
    await frames(80)
    expect(body.style.transform).toBe('')
    expect(activeTickerCount()).toBe(0)
    h.destroy()
    expect(root.hasAttribute(SCROLL_ROOT_ATTR)).toBe(false)
  })

  it('wheeling past the end squashes against it, then jelly-settles', async () => {
    const { root, viewport, body, scrollTo } = area()
    const h = attachScrollArea(root, { stretch: false })
    scrollTo(900) // the end
    await frames(30)
    for (let i = 0; i < 3; i++) {
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }))
      await frames(1)
    }
    expect(h.stretch.y).toBeLessThan(0)
    expect(body.style.transformOrigin).toBe('50% 100%')
    // Wheeling into the middle direction does nothing.
    await frames(90)
    expect(body.style.transform).toBe('')
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -40 }))
    expect(h.running).toBe(false)
    h.destroy()
  })

  it('effects off or reduced motion: a plain thumb', async () => {
    const { root, viewport, body, scrollTo } = area()
    const h = attachScrollArea(root, { stretch: false, jelly: false })
    scrollTo(100)
    scrollTo(900)
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }))
    await frames(3)
    expect(body.style.transform).toBe('')
    h.destroy()

    document.documentElement.dataset.reducedMotion = 'true'
    const b = area()
    const h2 = attachScrollArea(b.root)
    b.scrollTo(200)
    b.scrollTo(400)
    await frames(3)
    expect(b.body.style.transform).toBe('')
    expect(activeTickerCount()).toBe(0)
    h2.destroy()
  })
})

describe('resizable bead', () => {
  it('a rest bead is a symmetric capsule; a bulge rises on the leading side only', () => {
    const base = { cx: 0, cy: 0, length: 24, thickness: 4, bulge: 0, swell: 0, vertical: true }
    const xs = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]))
    const rest = xs(resizableBeadPath(base))
    expect(Math.max(...rest)).toBeCloseTo(2)
    expect(Math.min(...rest)).toBeCloseTo(-2)
    const right = xs(resizableBeadPath({ ...base, bulge: 3 }))
    expect(Math.max(...right)).toBeCloseTo(5)
    expect(Math.min(...right)).toBeGreaterThan(-2) // trailing side draws in a little
    const left = xs(resizableBeadPath({ ...base, bulge: -3 }))
    expect(Math.min(...left)).toBeCloseTo(-5)
    expect(resizableBeadPath(base).endsWith('Z')).toBe(true)
    expect([...RESIZABLE_EFFECTS]).toEqual(['bulge', 'wobble'])
    expect(RESIZABLE_FEEL.wild.max).toBeGreaterThan(RESIZABLE_FEEL.subtle.max)
  })

  it('the mound is low and wide: zero slope at the bead ends (no knob)', () => {
    const d = resizableBeadPath({ cx: 0, cy: 0, length: 40, thickness: 1, bulge: 3, swell: 0, vertical: false })
    const pts = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m): [number, number] => [Number(m[1]), Number(m[2])])
    const top = pts.slice(0, pts.length / 2)
    // Horizontal divider: the bulge is along y; the peak sits in the middle.
    const peak = top.reduce((a, b) => (b[1] > a[1] ? b : a))
    expect(Math.abs(peak[0])).toBeLessThan(2)
    expect(peak[1]).toBeCloseTo(3.5)
  })

  it('reads both primitives’ drag state', () => {
    const el = document.createElement('div')
    expect(isResizableDragging(el)).toBe(false)
    el.setAttribute('data-state', 'drag')
    expect(isResizableDragging(el)).toBe(true)
    el.setAttribute('data-state', 'hover')
    el.setAttribute('data-separator', 'active')
    expect(isResizableDragging(el)).toBe(true)
  })

  const handle = (grip = true) => {
    const el = document.createElement('div')
    el.style.position = 'relative'
    if (grip) {
      const g = document.createElement('div')
      g.setAttribute(RESIZABLE_GRIP_ATTR, '')
      el.append(g)
    }
    document.body.append(el)
    return el
  }

  it('adds one aria-hidden svg; dragging swells the bead and hides the real grip; release settles', async () => {
    const el = handle()
    const h = attachResizableHandle(el)
    const svg = el.querySelector('svg[data-goop="resizable"]') as SVGElement
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.style.display).toBe('none')
    el.setAttribute('data-state', 'drag')
    await frames(12)
    expect(h.dragging).toBe(true)
    expect(h.pose.swell).toBeGreaterThan(0)
    expect(svg.style.display).toBe('')
    expect((el.querySelector(`[${RESIZABLE_GRIP_ATTR}]`) as HTMLElement).style.visibility).toBe('hidden')
    el.setAttribute('data-state', 'hover')
    await frames(120)
    expect(h.running).toBe(false)
    expect(svg.style.display).toBe('none')
    expect((el.querySelector(`[${RESIZABLE_GRIP_ATTR}]`) as HTMLElement).style.visibility).toBe('')
    expect(activeTickerCount()).toBe(0)
    h.destroy()
    expect(el.querySelector('svg')).toBeNull()
  })

  it('bulge off or reduced motion: nothing moves', async () => {
    const el = handle(false)
    const h = attachResizableHandle(el, { bulge: false })
    el.setAttribute('data-separator', 'active')
    await frames(4)
    expect(h.pose.swell).toBe(0)
    h.destroy()
    document.documentElement.dataset.reducedMotion = 'true'
    const el2 = handle()
    const h2 = attachResizableHandle(el2)
    el2.setAttribute('data-state', 'drag')
    await frames(4)
    expect(h2.pose.swell).toBe(0)
    expect(activeTickerCount()).toBe(0)
    h2.destroy()
  })
})

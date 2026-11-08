import { afterEach, describe, expect, it } from 'vitest'
import { EMPTY_EFFECTS, EMPTY_FEEL, activeTickerCount, attachEmptyPuddle, emptyPuddleBounds, emptyPuddleBreath, emptyPuddlePath } from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const pts = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))

describe('empty puddle shape', () => {
  it('is a low, wide pool under the media whose middle rises to meet it', () => {
    const f = EMPTY_FEEL.playful
    const d = emptyPuddlePath({ width: 32, height: 32, feel: f, seed: 3 })
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    const p = pts(d)
    const xs = p.map((q) => q.x)
    const ys = p.map((q) => q.y)
    const b = emptyPuddleBounds(32, 32, f)
    // Wider than the media, centred on it.
    expect(Math.min(...xs)).toBeCloseTo(16 - b.half, 1)
    expect(Math.max(...xs)).toBeCloseTo(16 + b.half, 1)
    expect(b.half * 2).toBeGreaterThan(32 * 1.5)
    // Low: it reaches only a few px below the media, and the mound stays inside the media.
    expect(Math.max(...ys)).toBeLessThan(32 + f.depth)
    expect(Math.min(...ys)).toBeGreaterThan(0)
    // Wide, never a knob: the top edge rises smoothly (no step bigger than a couple of px).
    const top = p.slice(0, 49)
    for (let i = 1; i < top.length; i++) expect(Math.abs(top[i]!.y - top[i - 1]!.y)).toBeLessThan(4)
  })

  it('off and degenerate boxes draw nothing; the seed varies the rim', () => {
    expect(emptyPuddlePath({ width: 32, height: 32, strength: 0 })).toBe('')
    expect(emptyPuddlePath({ width: 0, height: 32 })).toBe('')
    expect(emptyPuddlePath({ width: 32, height: 32, seed: 1 })).not.toBe(emptyPuddlePath({ width: 32, height: 32, seed: 2 }))
    expect([...EMPTY_EFFECTS]).toEqual(['puddle', 'breathe'])
  })

  it('breathes about 1px, slowly; still when off', () => {
    const v = emptyPuddleBreath(32, 32)
    const b = emptyPuddleBounds(32, 32)
    expect((Number(v['--goop-puddle-sx']) - 1) * b.half).toBeCloseTo(EMPTY_FEEL.playful.breath, 1)
    expect(Number.parseFloat(v['--goop-puddle-period']!)).toBeGreaterThanOrEqual(4)
    expect(emptyPuddleBreath(32, 32, { breathe: false })).toEqual({})
    expect(emptyPuddleBreath(32, 32, { speed: 2 })['--goop-puddle-period']).toBe('3s')
  })
})

describe('attachEmptyPuddle', () => {
  const media = () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'offsetWidth', { get: () => 32 })
    Object.defineProperty(el, 'offsetHeight', { get: () => 32 })
    el.innerHTML = '<svg data-icon></svg>'
    document.body.append(el)
    return el
  }

  it('adds one aria-hidden breathing puddle behind the media, no frame loop; destroy removes it', () => {
    const el = media()
    const h = attachEmptyPuddle(el)
    const svg = el.firstElementChild as SVGSVGElement
    expect(svg).toBe(h.element)
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('data-goop')).toBe('empty-puddle')
    expect(svg.hasAttribute('data-goop-breathe')).toBe(true)
    expect(svg.style.getPropertyValue('--goop-puddle-sx')).not.toBe('')
    expect(activeTickerCount()).toBe(0)
    h.destroy()
    expect(el.querySelector('[data-goop]')).toBeNull()
  })

  it('reduced motion: static puddle (no breathing); puddle off hides it', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = media()
    const h = attachEmptyPuddle(el)
    expect(h.element.hasAttribute('data-goop-breathe')).toBe(false)
    expect(h.element.style.display).toBe('')
    h.update({ puddle: false })
    expect(h.element.style.display).toBe('none')
    h.destroy()
  })
})

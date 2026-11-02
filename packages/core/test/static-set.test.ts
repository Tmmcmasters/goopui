import { afterEach, describe, expect, it } from 'vitest'
import {
  CARD_FEEL,
  attachCard,
  avatarSettleOn,
  avatarStyle,
  badgeStyle,
  badgeSwellOn,
  cardPath,
  cardPull,
  effectStrength,
  skeletonShimmerOn,
  skeletonStyle,
  type CardMound,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('effectStrength', () => {
  it('maps toggles to strengths', () => {
    expect(effectStrength(undefined)).toBe(1)
    expect(effectStrength(true)).toBe(1)
    expect(effectStrength(false)).toBe(0)
    expect(effectStrength(0.5)).toBe(0.5)
    expect(effectStrength(-2)).toBe(0)
    expect(effectStrength(Number.NaN)).toBe(0)
  })
})

describe('skeletonStyle', () => {
  it('resolves the preset into vars', () => {
    const playful = skeletonStyle()
    expect(playful['--goop-shimmer-period']).toBe('2.4s')
    expect(playful['--goop-shimmer-lift']).toBe('1')
    expect(Number.parseFloat(skeletonStyle({ preset: 'subtle' })['--goop-shimmer-period']!)).toBeGreaterThan(2.4)
    expect(skeletonStyle({ speed: 2 })['--goop-shimmer-period']).toBe('1.2s')
    expect(skeletonStyle({ shimmer: 0.5 })['--goop-shimmer-lift']).toBe('0.5')
  })
  it('is empty when off', () => {
    expect(skeletonStyle({ shimmer: false })).toEqual({})
    expect(skeletonShimmerOn({ shimmer: false })).toBe(false)
    expect(skeletonShimmerOn()).toBe(true)
  })
})

describe('badgeStyle / avatarStyle', () => {
  it('badge swell is about 1px on playful and scales', () => {
    expect(badgeStyle()['--goop-badge-swell-size']).toBe('1px')
    expect(badgeStyle({ swell: 2 })['--goop-badge-swell-size']).toBe('2px')
    expect(badgeStyle({ swell: false })).toEqual({})
    expect(badgeSwellOn({ swell: 0 })).toBe(false)
  })
  it('avatar settles from below full size with a small overshoot', () => {
    const s = avatarStyle()
    expect(Number(s['--goop-settle-from'])).toBeLessThan(1)
    expect(Number(s['--goop-settle-over'])).toBeGreaterThan(1)
    expect(Number(s['--goop-settle-over'])).toBeLessThan(1.15)
    expect(Number(s['--goop-settle-under'])).toBeLessThan(1)
    expect(avatarStyle({ settle: false })).toEqual({})
    expect(avatarSettleOn({ settle: false })).toBe(false)
  })
})

describe('cardPath', () => {
  const flat: Record<'top' | 'right' | 'bottom' | 'left', CardMound> = {
    top: { amp: 0, at: 0 },
    right: { amp: 0, at: 0 },
    bottom: { amp: 0, at: 0 },
    left: { amp: 0, at: 0 },
  }
  const ys = (d: string): number[] => [...d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => Number(m[2]))

  it('a flat card is its rounded box', () => {
    const d = cardPath({ width: 200, height: 100, radius: 12, border: 1, spread: 60, mounds: flat })
    expect(d.startsWith('M12 0.5')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(Math.min(...ys(d))).toBeGreaterThanOrEqual(0.5)
  })

  it('a mound is low, wide and pushed outward, and fades before the corners', () => {
    const d = cardPath({ width: 200, height: 100, radius: 12, border: 1, spread: 60, mounds: { ...flat, top: { amp: 4, at: 88 } } })
    const top = ys(d).filter((y) => y < 0.5)
    expect(Math.min(...top)).toBeCloseTo(0.5 - 4, 1)
    // Many gently sloping points, not a spike.
    expect(top.length).toBeGreaterThan(10)
  })

  it('pull eases from the edge to zero at reach', () => {
    expect(cardPull(0, 80)).toBe(1)
    expect(cardPull(40, 80)).toBeCloseTo(0.5)
    expect(cardPull(80, 80)).toBe(0)
    expect(cardPull(200, 80)).toBe(0)
  })
})

describe('attachCard', () => {
  const card = (): HTMLElement => {
    const el = document.createElement('div')
    el.style.cssText = 'width:300px;height:200px;border:1px solid red;border-radius:12px;background:white'
    document.body.append(el)
    return el
  }

  it('adds one hidden aria-hidden svg and removes it on destroy', () => {
    const el = card()
    const h = attachCard(el)
    const svg = el.querySelector('[data-goop="card"]') as SVGElement
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.style.display).toBe('none')
    expect(el.firstElementChild).toBe(svg)
    h.destroy()
    expect(el.querySelector('[data-goop="card"]')).toBeNull()
  })

  it('ignores touch and reduced motion', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = card()
    const h = attachCard(el)
    el.dispatchEvent(new PointerEvent('pointerenter', { clientX: 150, clientY: 2, pointerType: 'mouse' }))
    const svg = el.querySelector('[data-goop="card"]') as SVGElement
    expect(svg.style.display).toBe('none')
    expect(svg.querySelector('path')!.getAttribute('d')).toBeNull()
    h.destroy()
  })

  it('feel is low: under 6px at the wildest preset', () => {
    for (const f of Object.values(CARD_FEEL)) expect(f.height).toBeLessThan(6)
  })
})

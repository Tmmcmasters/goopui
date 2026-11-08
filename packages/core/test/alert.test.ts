import { afterEach, describe, expect, it } from 'vitest'
import {
  ALERT_BLOOMING_ATTR,
  ALERT_EFFECTS,
  ALERT_FEEL,
  activeTickerCount,
  alertDuration,
  alertPath,
  alertPose,
  attachAlert,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const sized = (el: HTMLElement, w: number, h: number): HTMLElement => {
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w })
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => h })
  return el
}

const sweep = (preset: keyof typeof ALERT_FEEL = 'playful', bloom = 1, wobble = 1) => {
  const feel = ALERT_FEEL[preset]
  const end = alertDuration(feel)
  const poses = []
  for (let t = 0.005; t <= end + 0.02; t += 0.005) poses.push(alertPose(t, feel, bloom, wobble))
  return { feel, end, poses }
}

describe('alert entrance pose', () => {
  it('blooms from short of its edge, overshoots a little past it, and settles flat', () => {
    const { feel, end, poses } = sweep()
    const reach = poses.map((p) => p.reach)
    expect(reach[0]!).toBeLessThan(-feel.rise * 0.9)
    const over = Math.max(...reach)
    expect(over).toBeGreaterThan(0.5)
    // Low: the overshoot is a few px, never a knob.
    expect(over).toBeLessThan(feel.rise * 0.35)
    expect(alertPose(end, feel)).toEqual({ reach: 0, mound: 0, tilt: 0, scale: 1 })
    expect(end).toBeLessThan(1.2)
  })

  it('the leading mound is low and the icon wobble is gentle', () => {
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      const { feel, poses } = sweep(p)
      expect(Math.max(...poses.map((x) => Math.abs(x.mound)))).toBeLessThanOrEqual(feel.mound + 1e-6)
      expect(Math.max(...poses.map((x) => Math.abs(x.tilt)))).toBeLessThanOrEqual(feel.tilt)
      expect(Math.max(...poses.map((x) => Math.abs(x.scale - 1)))).toBeLessThanOrEqual(feel.pop)
    }
    expect(ALERT_FEEL.wild.mound).toBeGreaterThan(ALERT_FEEL.subtle.mound)
  })

  it('toggles: bloom 0 keeps the body still, wobble 0 keeps the icon still', () => {
    for (const p of sweep('playful', 0, 1).poses) expect(p.reach === 0 && p.mound === 0).toBe(true)
    for (const p of sweep('playful', 1, 0).poses) expect(p.tilt === 0 && p.scale === 1).toBe(true)
    expect([...ALERT_EFFECTS]).toEqual(['bloom', 'wobble'])
  })

  it('draws a closed rounded box whose bottom edge moves with reach', () => {
    const d = alertPath({ width: 300, height: 60, radius: 8, border: 1, reach: -10, mound: 2, at: 150, spread: 120 })
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d).toContain('A')
    const ys = [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[2]))
    expect(Math.max(...ys)).toBeLessThanOrEqual(60 - 10 + 2 + 1e-6)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
  })
})

describe('attachAlert', () => {
  const alert = (): HTMLElement => {
    const el = sized(document.createElement('div'), 300, 60)
    el.style.backgroundColor = 'rgb(10, 10, 10)'
    el.innerHTML = '<svg data-icon></svg><div>Title</div>'
    document.body.append(el)
    return el
  }

  it('plays once on attach, then restores the alert and its icon', () => {
    const el = alert()
    const h = attachAlert(el)
    expect(h.running).toBe(true)
    expect(el.hasAttribute(ALERT_BLOOMING_ATTR)).toBe(true)
    const layer = el.querySelector('[data-goop="alert"]') as HTMLElement
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.style.display).toBe('')
    expect(el.style.backgroundColor).toBe('transparent')
    expect((el.querySelector('svg[data-icon]') as SVGElement).style.transform).toContain('rotate')
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(el.querySelector('[data-goop="alert"]')).toBeNull()
    expect(el.style.backgroundColor).toBe('rgb(10, 10, 10)')
    expect((el.querySelector('svg[data-icon]') as SVGElement).style.transform).toBe('')
  })

  it('wobble only: the body keeps its own paint', () => {
    const el = alert()
    const h = attachAlert(el, { bloom: false })
    expect(h.running).toBe(true)
    expect(el.style.backgroundColor).toBe('rgb(10, 10, 10)')
    h.destroy()
  })

  it('is static when off or under reduced motion', () => {
    expect(attachAlert(alert(), { bloom: false, wobble: false }).running).toBe(false)
    document.documentElement.dataset.reducedMotion = 'true'
    const el = alert()
    expect(attachAlert(el).running).toBe(false)
    expect(el.style.backgroundColor).toBe('rgb(10, 10, 10)')
  })
})

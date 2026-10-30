import { afterEach, describe, expect, it } from 'vitest'
import {
  ACCORDION_ALL_EFFECTS,
  ACCORDION_CONTENT_ATTR,
  ACCORDION_FEEL,
  ACCORDION_FLOODED_ATTR,
  ACCORDION_STILL_ATTR,
  ACCORDION_TIMING_VARS,
  ACCORDION_TRIGGER_ATTR,
  GOOP_PART_ATTR,
  accordionCurves,
  accordionDamping,
  accordionEasing,
  accordionSettle,
  accordionSpring,
  activeTickerCount,
  attachAccordion,
} from '../src'

const feel = ACCORDION_FEEL.playful
const fx = (jelly: number) => ({ ...ACCORDION_ALL_EFFECTS, jelly })
const tick = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('content spring', () => {
  it('overshoots with jelly, never without, and settles at 1', () => {
    const z1 = accordionDamping(feel, 1)
    const z0 = accordionDamping(feel, 0)
    expect(z1).toBeCloseTo(feel.damping)
    expect(z0).toBe(1)
    const ts = Array.from({ length: 300 }, (_, i) => i * 0.005)
    expect(Math.max(...ts.map((t) => accordionSpring(t, feel.stiffness, z1)))).toBeGreaterThan(1.1)
    expect(Math.max(...ts.map((t) => accordionSpring(t, feel.stiffness, z0)))).toBeLessThanOrEqual(1)
    const T = accordionSettle(feel.stiffness, z1)
    expect(T).toBeGreaterThan(0.3)
    expect(T).toBeLessThan(1.2)
    expect(Math.abs(1 - accordionSpring(T, feel.stiffness, z1))).toBeLessThan(0.005)
  })

  it('caps the overshoot in px and closes short without undershoot', () => {
    const c = accordionCurves(feel, ACCORDION_ALL_EFFECTS, 400)
    const qs = Array.from({ length: 201 }, (_, i) => i / 200)
    const peak = Math.max(...qs.map(c.openCurve))
    expect((peak - 1) * 400).toBeLessThanOrEqual(feel.overshoot + 0.01)
    expect(peak).toBeGreaterThan(1)
    expect(c.close).toBeLessThan(c.open)
    expect(c.close).toBeLessThan(0.45)
    for (const q of qs) expect(c.closeCurve(q)).toBeLessThanOrEqual(1)
    const flat = accordionCurves(feel, fx(0), 400)
    expect(Math.max(...qs.map(flat.openCurve))).toBeLessThanOrEqual(1)
  })

  it('wild bounces more than subtle', () => {
    const peak = (p: 'subtle' | 'wild') => {
      const c = accordionCurves(ACCORDION_FEEL[p], ACCORDION_ALL_EFFECTS, 1000)
      return Math.max(...Array.from({ length: 201 }, (_, i) => c.openCurve(i / 200)))
    }
    expect(peak('wild')).toBeGreaterThan(peak('subtle'))
  })

  it('builds a linear() easing', () => {
    const e = accordionEasing((q) => q, 4)
    expect(e).toBe('linear(0, 0.25, 0.5, 0.75, 1)')
  })
})

describe('attachAccordion', () => {
  const item = (open = false): { host: HTMLElement; trigger: HTMLButtonElement; content: HTMLElement } => {
    const host = document.createElement('div')
    host.setAttribute('data-goop-accordion', '')
    host.setAttribute('data-state', open ? 'open' : 'closed')
    const trigger = document.createElement('button')
    trigger.setAttribute(ACCORDION_TRIGGER_ATTR, '')
    trigger.setAttribute('data-state', open ? 'open' : 'closed')
    trigger.textContent = 'Question'
    const content = document.createElement('div')
    content.setAttribute(ACCORDION_CONTENT_ATTR, '')
    host.append(trigger, content)
    document.body.append(host)
    return { host, trigger, content }
  }
  const setOpen = (i: { host: HTMLElement; trigger: HTMLElement }, open: boolean): void => {
    i.host.setAttribute('data-state', open ? 'open' : 'closed')
    i.trigger.setAttribute('data-state', open ? 'open' : 'closed')
  }

  it('puts the toggle fill on the trigger and publishes the content timing; idle at rest', () => {
    const it0 = item()
    const h = attachAccordion(it0.host)
    const layer = it0.trigger.querySelector(`[${GOOP_PART_ATTR}="layer"]`)!
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.getAttribute('data-goop-part')).toBe('accordion')
    expect(it0.host.style.getPropertyValue(ACCORDION_TIMING_VARS.open)).toMatch(/s$/)
    expect(it0.host.style.getPropertyValue(ACCORDION_TIMING_VARS.openEase)).toMatch(/^linear\(/)
    expect(it0.host.style.getPropertyValue(ACCORDION_TIMING_VARS.close)).toMatch(/s$/)
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    expect(it0.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(false)
    h.destroy()
  })

  it('an open item at mount is a full, flooded row with nothing running', () => {
    const it0 = item(true)
    const h = attachAccordion(it0.host)
    expect(h.fill!.pose!.levels).toEqual([1])
    expect(it0.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(true)
    expect(h.running).toBe(false)
    h.destroy()
  })

  it('floods on open, drains on close, cleans up', async () => {
    const it0 = item()
    const h = attachAccordion(it0.host)
    setOpen(it0, true)
    await tick()
    expect(h.running).toBe(true)
    expect(h.fill!.pose!.levels[0]).toBeLessThan(1)
    setOpen(it0, false)
    await tick()
    expect(h.running).toBe(true)
    h.destroy()
    expect(it0.trigger.querySelector(`[${GOOP_PART_ATTR}="layer"]`)).toBeNull()
    expect(it0.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(false)
    expect(it0.host.style.getPropertyValue(ACCORDION_TIMING_VARS.open)).toBe('')
    expect(activeTickerCount()).toBe(0)
  })

  it('speed scales the published durations', () => {
    const a = item()
    const b = item()
    const ha = attachAccordion(a.host)
    const hb = attachAccordion(b.host, { speed: 2 })
    const sec = (el: HTMLElement) => Number.parseFloat(el.style.getPropertyValue(ACCORDION_TIMING_VARS.open))
    expect(sec(b.host)).toBeCloseTo(sec(a.host) / 2, 2)
    ha.destroy()
    hb.destroy()
  })

  it('reduced motion: static fill, data-goop-still, no ticker', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const it0 = item()
    const h = attachAccordion(it0.host, { reducedMotion: true })
    expect(it0.host.hasAttribute(ACCORDION_STILL_ATTR)).toBe(true)
    setOpen(it0, true)
    await tick()
    expect(h.running).toBe(false)
    expect(h.fill!.pose!.levels).toEqual([1])
    expect(it0.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(true)
    setOpen(it0, false)
    await tick()
    expect(h.fill!.pose!.levels).toEqual([0])
    expect(it0.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(false)
    h.destroy()
    expect(it0.host.hasAttribute(ACCORDION_STILL_ATTR)).toBe(false)
  })

  it('flood off snaps the fill', async () => {
    const it0 = item()
    const h = attachAccordion(it0.host, { flood: false, wobble: false, droplets: false })
    setOpen(it0, true)
    await tick()
    expect(h.fill!.pose!.levels).toEqual([1])
    expect(h.running).toBe(false)
    h.destroy()
  })

  it('works without a trigger part (content timing only)', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const h = attachAccordion(host)
    expect(h.fill).toBeNull()
    expect(host.style.getPropertyValue(ACCORDION_TIMING_VARS.open)).not.toBe('')
    h.destroy()
  })
})

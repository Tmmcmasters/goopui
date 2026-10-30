import { afterEach, describe, expect, it } from 'vitest'
import {
  ACCORDION_ALL_EFFECTS,
  ACCORDION_CIRCLES,
  ACCORDION_FEEL,
  ACCORDION_STILL_ATTR,
  ACCORDION_TIMING_VARS,
  GOOP_PART_ATTR,
  accordionDelay,
  accordionFill,
  accordionFlowBetween,
  accordionPose,
  accordionStaticPose,
  accordionToggleEnd,
  activeTickerCount,
  attachAccordion,
  type AccordionEffects,
  type AccordionGeometry,
  type GooCircle,
} from '../src'

const feel = ACCORDION_FEEL.playful
const G: AccordionGeometry = { width: 300, height: 140, head: 40, content: 100, source: { x: 280, y: 20, r: 12 } }
const visible = (cs: GooCircle[]): GooCircle[] => cs.filter((c) => c.r > 0)
const drips = (cs: GooCircle[]): GooCircle[] => visible(cs.slice(1))
const fx = (o: Partial<AccordionEffects>): AccordionEffects => ({ ...ACCORDION_ALL_EFFECTS, ...o })

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('accordionFill', () => {
  it('overshoots with jelly and settles at 1; critically damped never overshoots', () => {
    const samples = Array.from({ length: 200 }, (_, i) => i * 0.01)
    const jelly = samples.map((s) => accordionFill(s, 0.42, 0.42))
    expect(Math.max(...jelly)).toBeGreaterThan(1.02)
    expect(accordionFill(3, 0.42, 0.42)).toBeCloseTo(1, 2)
    expect(Math.max(...samples.map((s) => accordionFill(s, 0.42, 1)))).toBeLessThanOrEqual(1)
    expect(accordionFill(0, 0.42, 0.42)).toBe(0)
  })
})

describe('accordionPose', () => {
  it('rests: open is a card over trigger + content, closed is only the source blob', () => {
    const open = accordionStaticPose(true, G)
    expect(open.rect).toEqual({ l: 0, r: 300, a: 0, b: 140 })
    expect(open.body).not.toBeNull()
    expect(open.circles).toHaveLength(ACCORDION_CIRCLES)
    expect(drips(open.circles)).toHaveLength(0)
    const closed = accordionStaticPose(false, { ...G, head: 40, height: 40 })
    expect(closed.body).toBeNull()
    expect(visible(closed.circles)).toHaveLength(1)
    expect(closed.circles[0]).toMatchObject({ x: 280, y: 20, r: 12 })
  })

  it('open: floods from the source, drips lead the front, then jelly-overshoots and lands', () => {
    const g = { ...G, height: 40 }
    const end = accordionToggleEnd(true)
    const early = accordionPose(feel.flood * 0.3, false, true, g)
    expect(early.rect!.r - early.rect!.l).toBeLessThan(300)
    expect(early.circles[0]!.r).toBeGreaterThan(12)
    const lead = accordionPose(feel.lead + 0.08, false, true, g)
    const ds = drips(lead.circles)
    expect(ds.length).toBeGreaterThan(0)
    expect(Math.max(...ds.map((d) => d.y))).toBeGreaterThan(lead.rect!.b)
    const bottoms = Array.from({ length: 120 }, (_, i) => accordionPose((i / 120) * end, false, true, g).rect?.b ?? 0)
    const over = Math.max(...bottoms) - 140
    expect(over).toBeGreaterThan(1)
    expect(over).toBeLessThanOrEqual(feel.overshoot + 0.01)
    expect(accordionPose(end, false, true, g).rect).toEqual({ l: 0, r: 300, a: 0, b: 140 })
  })

  it('open without jelly never passes the content height', () => {
    const e = fx({ jelly: 0 })
    const end = accordionToggleEnd(true, feel, e)
    for (let i = 0; i <= 60; i++) {
      const b = accordionPose((i / 60) * end, false, true, G, feel, e).rect?.b ?? 0
      expect(b).toBeLessThanOrEqual(140.001)
    }
  })

  it('close: sucks the front up with hanging drips, drains into the source and sloshes', () => {
    const half = accordionPose(feel.close * 0.5, true, false, G)
    expect(half.rect!.b).toBeLessThan(140)
    expect(half.rect!.b).toBeGreaterThan(40)
    expect(drips(half.circles).length).toBeGreaterThan(0)
    const draining = accordionPose(feel.close + feel.drain * 0.5, true, false, G)
    expect(draining.rect!.r - draining.rect!.l).toBeLessThan(300)
    expect(draining.circles[0]!.r).toBeGreaterThan(12)
    const end = accordionToggleEnd(false)
    const rs = Array.from({ length: 40 }, (_, i) => accordionPose(feel.close + feel.drain + (i / 40) * 0.4, true, false, G).circles[0]!)
    expect(rs.some((c) => Math.abs(c.sx - 1) > 0.02)).toBe(true)
    const rest = accordionPose(end, true, false, G)
    expect(rest.body).toBeNull()
    expect(rest.circles[0]).toMatchObject({ r: 12, sx: 1, sy: 1 })
  })

  it('every effect turns off on its own', () => {
    const t = feel.lead + 0.08
    expect(drips(accordionPose(t, false, true, G, feel, fx({ drips: 0 })).circles)).toHaveLength(0)
    expect(accordionPose(t, false, true, G, feel, fx({ fill: 0 })).body).toBeNull()
    expect(accordionStaticPose(false, G, feel, fx({ source: 0 })).circles[0]!.r).toBe(0)
    const still = Array.from({ length: 30 }, (_, i) =>
      accordionPose(feel.close + feel.drain + i * 0.02, true, false, G, feel, fx({ slosh: 0 })).circles[0]!,
    )
    expect(still.every((c) => c.sx === 1)).toBe(true)
    expect(accordionDelay(true, 'down', feel, fx({ handoff: 0 }))).toBe(0)
    expect(accordionDelay(true, 'down', feel, ACCORDION_ALL_EFFECTS)).toBeGreaterThan(0)
  })

  it('handoff: the closing item drains out of the edge facing the opening one', () => {
    const t = (feel.close + feel.drain) * 0.5
    const down = accordionPose(t, true, false, G, feel, ACCORDION_ALL_EFFECTS, 'down')
    expect(down.rect!.a).toBeGreaterThan(0)
    expect(down.rect!.b).toBeCloseTo(140)
    const up = accordionPose(feel.close + feel.drain * 0.5, true, false, G, feel, ACCORDION_ALL_EFFECTS, 'up')
    expect(up.rect).toMatchObject({ l: 0, r: 300, a: 0 })
    // The opening item waits, then fills from the edge facing the closing one.
    const g = { ...G, height: 40 }
    expect(accordionPose(0.01, false, true, g, feel, ACCORDION_ALL_EFFECTS, 'down').body).toBeNull()
    const fromAbove = accordionPose(feel.handoff + feel.flood * 0.5, false, true, g, feel, ACCORDION_ALL_EFFECTS, 'down')
    expect(fromAbove.rect).toMatchObject({ l: 0, r: 300, a: 0 })
    expect(fromAbove.rect!.b).toBeLessThan(40)
  })

  it('flow direction follows document order', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    document.body.append(a, b)
    expect(accordionFlowBetween(a, b)).toBe('down')
    expect(accordionFlowBetween(b, a)).toBe('up')
  })
})

describe('attachAccordion', () => {
  const item = (): HTMLElement => {
    const el = document.createElement('div')
    el.setAttribute('data-goop-accordion', '')
    el.innerHTML = '<h3><button><svg data-goop-accordion-source></svg></button></h3><div data-goop-accordion-content hidden><div>Body</div></div>'
    document.body.append(el)
    return el
  }

  it('adds one aria-hidden layer, publishes CSS timing and animates on toggle', () => {
    const el = item()
    const h = attachAccordion(el, { open: false })
    const layers = el.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)
    expect(layers).toHaveLength(1)
    expect(layers[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(ACCORDION_CIRCLES)
    expect(el.style.getPropertyValue(ACCORDION_TIMING_VARS.open)).toMatch(/s$/)
    expect(h.running).toBe(false)
    h.update({ open: true })
    expect(h.running).toBe(true)
    expect(activeTickerCount()).toBe(1)
    h.update({ open: false, flow: 'down' })
    expect(h.running).toBe(true)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(el.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
    expect(el.style.getPropertyValue(ACCORDION_TIMING_VARS.open)).toBe('')
  })

  it('handoff delays the CSS reveal of the opening item', () => {
    const el = item()
    const h = attachAccordion(el, { open: false })
    h.update({ open: true, flow: 'down' })
    const delayed = Number.parseFloat(el.style.getPropertyValue(ACCORDION_TIMING_VARS.delay))
    expect(delayed).toBeCloseTo(feel.handoff + feel.lead, 2)
    h.destroy()
  })

  it('reduced motion: no animation, resting pose, marked still', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = item()
    const h = attachAccordion(el, { open: false, reducedMotion: true })
    h.update({ open: true })
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    expect(el.hasAttribute(ACCORDION_STILL_ATTR)).toBe(true)
    expect(h.pose?.circles.slice(1).every((c) => c.r === 0)).toBe(true)
    h.destroy()
  })
})

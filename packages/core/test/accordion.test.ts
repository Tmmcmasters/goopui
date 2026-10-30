import { afterEach, describe, expect, it } from 'vitest'
import {
  ACCORDION_ALL_EFFECTS,
  ACCORDION_CIRCLES,
  ACCORDION_FEEL,
  ACCORDION_FINGERS,
  ACCORDION_STILL_ATTR,
  ACCORDION_TIMING_VARS,
  GOOP_PART_ATTR,
  accordionDelay,
  accordionEasing,
  accordionFill,
  accordionFlowBetween,
  accordionLand,
  accordionPose,
  accordionSplashCount,
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
  const g0 = { ...G, height: 40 }
  const sample = (from: boolean, to: boolean, e = ACCORDION_ALL_EFFECTS, n = 160) => {
    const end = accordionToggleEnd(to, feel, e)
    return Array.from({ length: n + 1 }, (_, i) => accordionPose((i / n) * end, from, to, from ? G : g0, feel, e))
  }

  it('rests with no goo at all, open or closed', () => {
    for (const open of [true, false]) {
      const p = accordionStaticPose(open, G)
      expect(p.body).toBeNull()
      expect(p.rect).toBeNull()
      expect(p.circles).toHaveLength(ACCORDION_CIRCLES)
      expect(visible(p.circles)).toHaveLength(0)
      expect(accordionPose(accordionToggleEnd(open), !open, open, G).body).toBeNull()
      expect(visible(accordionPose(accordionToggleEnd(open), !open, open, G).circles)).toHaveLength(0)
    }
  })

  it('open: wells out of the source, pours down with fingers ahead, jelly-overshoots and lands', () => {
    const early = accordionPose(0.02, false, true, g0)
    expect(early.rect!.r - early.rect!.l).toBeLessThan(300)
    const mid = accordionPose(accordionLand() * 0.5, false, true, g0)
    const fingers = visible(mid.circles.slice(1, 1 + ACCORDION_FINGERS))
    expect(fingers.length).toBeGreaterThan(0)
    expect(Math.max(...fingers.map((c) => c.y + c.r))).toBeGreaterThan(mid.rect!.b)
    const bottoms = sample(false, true).map((p) => p.rect?.b ?? 0)
    const over = Math.max(...bottoms) - 140
    expect(over).toBeGreaterThan(1)
    expect(over).toBeLessThanOrEqual(feel.overshoot + 0.01)
    // After landing only a thin puddle is left, and it drains away.
    const after = accordionPose(accordionLand() + feel.drain * 0.5, false, true, g0)
    expect(after.rect!.b - after.rect!.a).toBeLessThanOrEqual(feel.puddle + 0.01)
    expect(accordionPose(accordionLand() + feel.drain + 0.01, false, true, g0).rect).toBeNull()
  })

  it('open: a splash of drops flies off the bottom edge on landing, falls and fades', () => {
    const land = accordionLand()
    const drops = (t: number) => visible(accordionPose(land + t, false, true, g0).circles.slice(1 + ACCORDION_FINGERS))
    expect(visible(accordionPose(land * 0.5, false, true, g0).circles.slice(1 + ACCORDION_FINGERS))).toHaveLength(0)
    const flying = drops(0.15)
    expect(flying.length).toBeGreaterThan(3)
    expect(flying.every((c) => c.y > 140)).toBe(true)
    const sizes = flying.map((c) => c.r)
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(1.5)
    expect(drops(0.6)).toHaveLength(0)
    expect(accordionSplashCount(300, feel, 1, 2)).toBeGreaterThan(accordionSplashCount(300, feel, 1, 1))
    expect(accordionSplashCount(300, feel, 1, 0)).toBe(0)
  })

  it('open without jelly never passes the content height', () => {
    const e = fx({ jelly: 0 })
    for (const p of sample(false, true, e, 60)) expect(p.rect?.b ?? 0).toBeLessThanOrEqual(140.001)
  })

  it('close: sucks the band up, gathers into the source, which sloshes and shrinks away', () => {
    const half = accordionPose(feel.close * 0.5, true, false, G)
    expect(half.rect!.b).toBeLessThan(140)
    expect(half.rect!.b).toBeGreaterThan(40)
    const gathering = accordionPose(feel.close + feel.gather * 0.6, true, false, G)
    expect(gathering.rect!.r - gathering.rect!.l).toBeLessThan(300)
    expect(gathering.circles[0]!.r).toBeGreaterThan(0)
    const blobs = Array.from({ length: 40 }, (_, i) => accordionPose(feel.close + feel.gather + i * 0.01, true, false, G).circles[0]!)
    expect(blobs.some((c) => Math.abs(c.sx - 1) > 0.02)).toBe(true)
    const rest = accordionPose(accordionToggleEnd(false), true, false, G)
    expect(rest.body).toBeNull()
    expect(rest.circles[0]!.r).toBe(0)
  })

  it('every effect turns off on its own', () => {
    const land = accordionLand()
    expect(accordionPose(land * 0.5, false, true, g0, feel, fx({ pour: 0 })).body).toBeNull()
    expect(visible(accordionPose(land + 0.15, false, true, g0, feel, fx({ pour: 0 })).circles).length).toBeGreaterThan(0)
    expect(visible(accordionPose(land + 0.15, false, true, g0, feel, fx({ splash: 0 })).circles.slice(1 + ACCORDION_FINGERS))).toHaveLength(0)
    expect(visible(accordionPose(land + 0.15, false, true, g0, feel, ACCORDION_ALL_EFFECTS, 'source', 0).circles.slice(1 + ACCORDION_FINGERS))).toHaveLength(0)
    const still = Array.from({ length: 30 }, (_, i) =>
      accordionPose(feel.close + feel.gather + i * 0.004, true, false, G, feel, fx({ slosh: 0 })).circles[0]!,
    )
    expect(still.every((c) => c.sx === 1)).toBe(true)
    expect(accordionDelay(true, 'down', feel, fx({ handoff: 0 }))).toBe(0)
    expect(accordionDelay(true, 'down', feel, ACCORDION_ALL_EFFECTS)).toBeGreaterThan(0)
  })

  it('handoff: the opening item waits a beat', () => {
    expect(accordionPose(0.01, false, true, g0, feel, ACCORDION_ALL_EFFECTS, 'down').body).toBeNull()
    expect(accordionPose(feel.handoff + 0.05, false, true, g0, feel, ACCORDION_ALL_EFFECTS, 'down').body).not.toBeNull()
  })

  it('easing: a CSS linear() that starts at 0 and ends at 1', () => {
    const e = accordionEasing((p) => p * p, 4)
    expect(e).toBe('linear(0, 0.0625, 0.25, 0.5625, 1)')
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
    expect(el.style.getPropertyValue(ACCORDION_TIMING_VARS.openEase)).toMatch(/^linear\(0, /)
    expect(h.running).toBe(false)
    h.update({ open: true })
    expect(h.running).toBe(true)
    expect(activeTickerCount()).toBe(1)
    h.update({ open: false, flow: 'down' })
    expect(h.running).toBe(true)
    // Jump to rest: nothing drawn, no ticker.
    h.update({ reducedMotion: true })
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    h.update({ reducedMotion: false })
    expect(h.running).toBe(false)
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
    expect(delayed).toBeCloseTo(feel.handoff, 2)
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
    expect(h.pose?.circles.every((c) => c.r === 0)).toBe(true)
    expect(h.pose?.body).toBeNull()
    h.destroy()
  })
})

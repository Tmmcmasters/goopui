import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  SWITCH_FEEL,
  SWITCH_FILL_CIRCLES,
  SWITCH_THUMB_CIRCLES,
  SWITCH_TRAVEL,
  activeTickerCount,
  attachSwitch,
  switchEffectValue,
  switchMetrics,
  switchPose,
  switchStaticPose,
} from '../src'

const G = { width: 32, height: 18.4 }
const { x0, x1, r } = switchMetrics(G)
const visible = (cs: { r: number }[]) => cs.filter((c) => c.r > 0)
const blobs = (host: Element) => host.querySelectorAll<HTMLElement>(`[${GOOP_PART_ATTR}="blob"]`)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('switchPose', () => {
  it('starts at the from side and rests at the far side', () => {
    const start = switchPose(0, 0, 1, G)
    expect(start.position).toBe(0)
    expect(start.thumb[0]!.x).toBeCloseTo(x0)
    const end = switchPose(1, 0, 1, G)
    expect(end.position).toBe(1)
    expect(end.thumb[0]).toMatchObject({ x: x1, r, sx: 1, sy: 1 })
    expect(switchPose(1, 1, 0, G).thumb[0]!.x).toBeCloseTo(x0)
    expect(start.thumb).toHaveLength(SWITCH_THUMB_CIRCLES)
    expect(start.fill).toHaveLength(SWITCH_FILL_CIRCLES)
  })

  it('resting poses: one round thumb; fill full when checked, empty when not', () => {
    const on = switchStaticPose(true, G)
    const off = switchStaticPose(false, G)
    expect(visible(on.thumb)).toHaveLength(1)
    expect(visible(off.thumb)).toHaveLength(1)
    expect(visible(on.fill)).toHaveLength(SWITCH_FILL_CIRCLES)
    expect(on.fill[0]!.x).toBeCloseTo(x0)
    expect(on.fill.at(-1)!.x).toBeCloseTo(x1)
    expect(visible(off.fill)).toHaveLength(0)
    expect(visible(on.thumb)).toEqual(visible(switchPose(1, 0, 1, G).thumb))
    expect(on.fill).toEqual(switchPose(1, 0, 1, G).fill)
    expect(visible(switchStaticPose(true, G, SWITCH_FEEL.playful, { stretch: 1, bridge: 1, squish: 1, fill: 0 }).fill)).toHaveLength(0)
  })

  it('leans and stretches the way it travels, teardrop tail behind', () => {
    const mid = switchPose(SWITCH_TRAVEL * 0.6, 0, 1, G)
    const [head, tail] = mid.thumb
    expect(head!.sx).toBeGreaterThan(1)
    expect(head!.sy).toBeLessThan(1)
    expect(tail!.r).toBeGreaterThan(0)
    expect(tail!.x).toBeLessThan(head!.x)
    // Mirror image going the other way.
    const back = switchPose(SWITCH_TRAVEL * 0.6, 1, 0, G)
    expect(back.thumb[1]!.x).toBeGreaterThan(back.thumb[0]!.x)
    expect(back.thumb[0]!.x).toBeCloseTo(x0 + x1 - head!.x)
    // stretch off: round the whole way.
    const flat = switchPose(SWITCH_TRAVEL * 0.6, 0, 1, G, SWITCH_FEEL.playful, { stretch: 0, bridge: 1, squish: 1, fill: 1 })
    expect(flat.thumb[0]!.sx).toBe(1)
  })

  it('bridges to the start, then snaps', () => {
    const neck = (t: number, bridge = 1) =>
      switchPose(t, 0, 1, G, SWITCH_FEEL.playful, { stretch: 1, bridge, squish: 1, fill: 1 }).thumb.slice(4)
    expect(visible(neck(SWITCH_TRAVEL * 0.2))).toHaveLength(3)
    expect(visible(neck(SWITCH_TRAVEL * 0.95))).toHaveLength(0)
    expect(visible(neck(SWITCH_TRAVEL * 0.2, 0))).toHaveLength(0)
  })

  it('squashes on landing and settles round', () => {
    const land = Array.from({ length: 20 }, (_, i) => switchPose(SWITCH_TRAVEL + ((1 - SWITCH_TRAVEL) * (i + 1)) / 21, 0, 1, G))
    expect(Math.min(...land.map((p) => p.thumb[0]!.sx))).toBeLessThan(0.95)
    const off = switchPose(SWITCH_TRAVEL + 0.06, 0, 1, G, SWITCH_FEEL.playful, { stretch: 0, bridge: 1, squish: 0, fill: 1 })
    expect(off.thumb[0]!.sx).toBe(1)
  })

  it('fills behind the thumb as it travels on', () => {
    const p = switchPose(SWITCH_TRAVEL * 0.8, 0, 1, G)
    expect(visible(p.fill).length).toBe(SWITCH_FILL_CIRCLES)
    expect(p.fill.at(-1)!.x).toBeLessThan(x1)
    expect(p.fill.at(-1)!.x).toBeGreaterThan(x0)
  })

  it('effect values', () => {
    expect(switchEffectValue(undefined)).toBe(1)
    expect(switchEffectValue(true)).toBe(1)
    expect(switchEffectValue(false)).toBe(0)
    expect(switchEffectValue(1.5)).toBe(1.5)
    expect(switchEffectValue(-2)).toBe(0)
  })
})

describe('attachSwitch', () => {
  const host = () => {
    const el = document.createElement('button')
    document.body.append(el)
    return el
  }

  it('draws two aria-hidden layers and animates a toggle on the shared loop', () => {
    const el = host()
    const h = attachSwitch(el, { checked: false })
    const layers = el.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)
    expect(layers).toHaveLength(2)
    for (const l of layers) expect(l.getAttribute('aria-hidden')).toBe('true')
    expect(blobs(el)).toHaveLength(SWITCH_FILL_CIRCLES + SWITCH_THUMB_CIRCLES)
    expect(h.running).toBe(false)
    h.update({ checked: true })
    expect(h.running).toBe(true)
    expect(activeTickerCount()).toBe(1)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(el.children).toHaveLength(0)
  })

  it('reduced motion: instant state change, static pose, no ticker', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = host()
    const h = attachSwitch(el, { checked: false })
    expect(h.reducedMotion).toBe(true)
    h.update({ checked: true })
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    expect(h.pose?.position).toBe(1)
    expect(visible(h.pose!.thumb)).toHaveLength(1)
    h.destroy()
  })
})

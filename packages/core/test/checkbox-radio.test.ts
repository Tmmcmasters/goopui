import { afterEach, describe, expect, it } from 'vitest'
import {
  CHECKBOX_CIRCLES,
  CHECKBOX_FALL,
  CHECKBOX_FEEL,
  GOOP_PART_ATTR,
  GOO_PENDING_ATTR,
  RADIO_CIRCLES,
  RADIO_FEEL,
  RADIO_TRAVEL,
  activeTickerCount,
  attachCheckbox,
  attachRadioGroup,
  checkboxPose,
  checkboxStaticPose,
  checkboxToggleEnd,
  gooBridge,
  radioPose,
  radioToggleEnd,
  splatAxes,
  splatCurve,
  type GooCircle,
} from '../src'

const G = { width: 14, height: 14 }
const visible = (cs: GooCircle[]): GooCircle[] => cs.filter((c) => c.r > 0)
const blobs = (host: Element) => host.querySelectorAll<HTMLElement>(`[${GOOP_PART_ATTR}="blob"]`)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('shared splat helpers', () => {
  it('splat curve starts flat, flattens, rebounds and is exactly 0 after settle', () => {
    expect(splatCurve(0, 0.6)).toBe(0)
    expect(splatCurve(0.05, 0.6)).toBeGreaterThan(0.3)
    expect(Math.min(...[0.12, 0.15, 0.18].map((a) => splatCurve(a, 0.6)))).toBeLessThan(0)
    expect(splatCurve(0.6, 0.6)).toBe(0)
    const { along, across } = splatAxes(1)
    expect(along).toBeLessThan(1)
    expect(across).toBeGreaterThan(1)
  })

  it('goo bridge holds a neck, then snaps and recoils', () => {
    const held = gooBridge(0.2, { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 1 }, 8, 1)
    expect(held.held).toBe(true)
    expect(visible(held.necks)).toHaveLength(3)
    expect(held.necks.every((n) => n.x === 0 && n.y > 0 && n.y < 20)).toBe(true)
    const snapped = gooBridge(0.95, { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 1 }, 8, 1)
    expect(snapped.held).toBe(false)
    expect(visible(snapped.necks)).toHaveLength(0)
    expect(snapped.anchor.y).toBeLessThan(0)
    expect(gooBridge(0.2, { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 1 }, 8, 0).held).toBe(false)
  })
})

describe('checkboxPose', () => {
  const END = checkboxToggleEnd(true)

  it('rests empty unchecked and full checked, with the mark showing', () => {
    const off = checkboxStaticPose(false, G)
    expect(off.body).toBeNull()
    expect(visible(off.circles)).toHaveLength(0)
    expect(off.pending).toBe(false)
    const on = checkboxStaticPose(true, G)
    expect(on.body).toEqual({ tx: 0, ty: 0, skew: 0, sx: 1, sy: 1 })
    expect(visible(on.circles)).toHaveLength(0)
    expect(on.pending).toBe(false)
    expect(on.circles).toHaveLength(CHECKBOX_CIRCLES)
  })

  it('a drop falls from above, accelerating and stretched, while the mark waits', () => {
    const a = checkboxPose(0.1, false, true, G)
    const b = checkboxPose(0.3, false, true, G)
    expect(a.body).toBeNull()
    expect(a.pending).toBe(true)
    expect(a.circles[0]!.y).toBeLessThan(0)
    expect(b.circles[0]!.y).toBeGreaterThan(a.circles[0]!.y)
    expect(b.circles[0]!.sy).toBeGreaterThan(1)
    expect(b.circles[0]!.sx).toBeLessThan(1)
  })

  it('lands: fills the box, splats flat and wide, splashes droplets, then settles and shows the mark', () => {
    const age = (s: number) => CHECKBOX_FALL + s / CHECKBOX_FEEL.playful.duration
    const splat = checkboxPose(age(0.05), false, true, G)
    expect(splat.body!.sx).toBeGreaterThan(splat.body!.sy)
    expect(splat.pending).toBe(true)
    const flying = checkboxPose(age(0.15), false, true, G)
    expect(visible(flying.circles.slice(-4)).length).toBeGreaterThanOrEqual(2)
    expect(checkboxPose(age(0.45), false, true, G).pending).toBe(false)
    expect(checkboxPose(END, false, true, G)).toEqual(checkboxStaticPose(true, G))
  })

  it('effect toggles: no splat stays round, no droplets, no fill', () => {
    const t = CHECKBOX_FALL + 0.05 / CHECKBOX_FEEL.playful.duration
    const flat = checkboxPose(t, false, true, G, undefined, { fill: 1, splat: 0, droplets: 1 })
    expect(flat.body!.sx).toBeCloseTo(flat.body!.sy)
    const dry = checkboxPose(t + 0.2, false, true, G, undefined, { fill: 1, splat: 1, droplets: 0 })
    expect(visible(dry.circles.slice(-4))).toHaveLength(0)
    const empty = checkboxPose(t, false, true, G, undefined, { fill: 0, splat: 1, droplets: 1 })
    expect(empty.body).toBeNull()
    expect(checkboxStaticPose(true, G, undefined, { fill: 0, splat: 1, droplets: 1 }).body).toBeNull()
  })

  it('unchecking sucks the fill up into a drop above the box, which pops', () => {
    const suck = checkboxPose(0.3, true, false, G)
    expect(suck.body!.sx).toBeLessThan(1)
    expect(suck.circles[0]!.y).toBeLessThan(G.height / 2)
    expect(suck.circles[0]!.r).toBeGreaterThan(0)
    const popped = checkboxPose(0.95, true, false, G)
    expect(popped.circles[0]!.r).toBeLessThan(suck.circles[0]!.r)
    expect(checkboxPose(1, true, false, G)).toEqual(checkboxStaticPose(false, G))
  })

  it('indeterminate is a horizontal goo bar that hides the mark', () => {
    const bar = checkboxStaticPose('indeterminate', G)
    const vis = visible(bar.circles)
    expect(vis).toHaveLength(5)
    expect(new Set(vis.map((c) => c.y)).size).toBe(1)
    expect(Math.max(...vis.map((c) => c.x)) - Math.min(...vis.map((c) => c.x))).toBeGreaterThan(G.width * 0.4)
    expect(bar.pending).toBe(true)
    expect(bar.body).toBeNull()
    const growing = checkboxPose(0.1, false, 'indeterminate', G)
    const w = (p: typeof growing) => Math.max(...visible(p.circles).map((c) => c.x)) - Math.min(...visible(p.circles).map((c) => c.x))
    expect(w(growing)).toBeLessThan(w(bar))
  })

  it('presets: wild falls from higher and lasts longer', () => {
    const y = (p: 'subtle' | 'wild') => checkboxPose(0.05, false, true, G, CHECKBOX_FEEL[p]).circles[0]!.y
    expect(y('wild')).toBeLessThan(y('subtle'))
    expect(checkboxToggleEnd(true, CHECKBOX_FEEL.wild) * CHECKBOX_FEEL.wild.duration).toBeGreaterThan(
      checkboxToggleEnd(true, CHECKBOX_FEEL.subtle) * CHECKBOX_FEEL.subtle.duration,
    )
  })
})

describe('radioPose', () => {
  const A = { x: 8, y: 8 }
  const B = { x: 8, y: 32 }
  const C = { x: 40, y: 8 }
  const R = 8
  const END = radioToggleEnd()

  it('rests round on the selected item', () => {
    const p = radioPose(END, A, B, R)
    expect(visible(p.circles)).toEqual([{ x: B.x, y: B.y, r: R, sx: 1, sy: 1 }])
    expect(p.pending).toBe(false)
    expect(p.circles).toHaveLength(RADIO_CIRCLES)
    expect(visible(radioPose(END, A, null, R).circles)).toHaveLength(0)
  })

  it('stretches out of the old item on a fat bridge, then snaps and flies', () => {
    const early = radioPose(0.12, A, B, R)
    expect(early.circles[0]!.y).toBeGreaterThan(A.y)
    expect(early.circles[0]!.sy).toBeGreaterThan(early.circles[0]!.sx)
    const necks = early.circles.slice(4, 7)
    expect(visible(necks)).toHaveLength(3)
    expect(early.pending).toBe(true)
    const late = radioPose(RADIO_TRAVEL * 0.95, A, B, R)
    expect(visible(late.circles.slice(4, 7))).toHaveLength(0)
    const noBridge = radioPose(0.12, A, B, R, undefined, { bridge: 0, splat: 1, droplets: 1 })
    expect(visible(noBridge.circles.slice(3, 7))).toHaveLength(0)
  })

  it('horizontal jumps hop and stretch along x', () => {
    const mid = radioPose(RADIO_TRAVEL * 0.5, A, C, R)
    expect(mid.circles[0]!.y).toBeLessThan(A.y)
    expect(mid.circles[0]!.sx).toBeGreaterThan(mid.circles[0]!.sy)
  })

  it('lands with a splat (flat along the flight) and droplets, then shows the dot', () => {
    const t = (s: number) => RADIO_TRAVEL + s / RADIO_FEEL.playful.duration
    const splat = radioPose(t(0.05), A, B, R)
    expect(splat.circles[0]!.sy).toBeLessThan(splat.circles[0]!.sx)
    expect(visible(radioPose(t(0.15), A, B, R).circles.slice(-4)).length).toBeGreaterThanOrEqual(2)
    expect(visible(radioPose(t(0.15), A, B, R, undefined, { bridge: 1, splat: 1, droplets: 0 }).circles.slice(-4))).toHaveLength(0)
    const round = radioPose(t(0.05), A, B, R, undefined, { bridge: 1, splat: 0, droplets: 0 })
    expect(round.circles[0]!.sy).toBeCloseTo(round.circles[0]!.sx, 1)
    expect(radioPose(t(0.4), A, B, R).pending).toBe(false)
  })

  it('first selection plops in', () => {
    const p = radioPose(0.02, null, B, R)
    expect(p.circles[0]!.r).toBeLessThan(R)
    expect(p.circles[0]!.x).toBe(B.x)
  })
})

describe('attach', () => {
  it('checkbox: one aria-hidden layer, animates on the shared loop, pending while landing', () => {
    const el = document.createElement('button')
    document.body.append(el)
    const h = attachCheckbox(el, { checked: false })
    const layers = el.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)
    expect(layers).toHaveLength(1)
    expect(layers[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(blobs(el)).toHaveLength(CHECKBOX_CIRCLES)
    expect(h.running).toBe(false)
    h.update({ checked: true })
    expect(h.running).toBe(true)
    expect(el.hasAttribute(GOO_PENDING_ATTR)).toBe(true)
    expect(activeTickerCount()).toBe(1)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(el.children).toHaveLength(0)
    expect(el.hasAttribute(GOO_PENDING_ATTR)).toBe(false)
  })

  it('checkbox reduced motion: static, no ticker', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = document.createElement('button')
    document.body.append(el)
    const h = attachCheckbox(el, { checked: false })
    h.update({ checked: true })
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    expect(h.pose?.fill).toBe(1)
    expect(el.hasAttribute(GOO_PENDING_ATTR)).toBe(false)
    h.destroy()
  })

  it('radio group: reads the checked item from the DOM and jumps on change', () => {
    const root = document.createElement('div')
    const items = [0, 1, 2].map((i) => {
      const b = document.createElement('button')
      b.setAttribute('role', 'radio')
      b.setAttribute('aria-checked', String(i === 0))
      root.append(b)
      return b
    })
    document.body.append(root)
    const h = attachRadioGroup(root, { value: 'a' })
    expect(root.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)).toHaveLength(1)
    expect(blobs(root)).toHaveLength(RADIO_CIRCLES)
    expect(h.running).toBe(false)
    items[0]!.setAttribute('aria-checked', 'false')
    items[2]!.setAttribute('aria-checked', 'true')
    h.update({ value: 'c' })
    expect(h.running).toBe(true)
    expect(root.hasAttribute(GOO_PENDING_ATTR)).toBe(true)
    h.update({ value: 'c' })
    expect(h.running).toBe(true)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  })
})

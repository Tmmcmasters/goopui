import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  INPUT_DEFAULT_EFFECTS,
  INPUT_DRIP_CIRCLES,
  INPUT_FEEL,
  INPUT_RING_MIN,
  addInputRipple,
  attachInput,
  createInputGooState,
  inputRingPose,
  ringArcAt,
  ringCircleCount,
  ringPerimeter,
  ringPoint,
  settleInputGoo,
  stepInputGoo,
  type GooCircle,
  type InputEffects,
  type InputGeometry,
} from '../src'

const G: InputGeometry = { x: 0, y: 0, width: 200, height: 32, radius: 8 }
const F = INPUT_FEEL.playful
const O = F.offset
const N = ringCircleCount(ringPerimeter(G, O), F.thickness)
const ringOf = (cs: GooCircle[]) => cs.slice(0, N)
const dripsOf = (cs: GooCircle[]) => cs.slice(N)
const shown = (cs: GooCircle[]) => cs.filter((c) => c.r > 0).length
const fx = (o: Partial<InputEffects> = {}): InputEffects => ({ ...INPUT_DEFAULT_EFFECTS, ...o })
const run = (st: ReturnType<typeof createInputGooState>, secs: number, e = fx()) => {
  for (let t = 0; t < secs; t += 1 / 60) stepInputGoo(st, 1 / 60, F, e)
}

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('ring geometry', () => {
  it('perimeter of the offset rounded rect', () => {
    const R = 8 + O
    const expected = 2 * (200 - 16) + 2 * (32 - 16) + 2 * Math.PI * R
    expect(ringPerimeter(G, O)).toBeCloseTo(expected, 6)
  })

  it('walks clockwise from the top edge with outward normals', () => {
    const P = ringPerimeter(G, O)
    const top = ringPoint(G, O, 10)
    expect(top.y).toBeCloseTo(-O)
    expect(top.ny).toBe(-1)
    const bottom = ringPoint(G, O, P / 2 + 10)
    expect(bottom.y).toBeCloseTo(32 + O)
    expect(bottom.ny).toBe(1)
    // Wraps around.
    expect(ringPoint(G, O, P + 10).x).toBeCloseTo(top.x)
  })

  it('finds the arc nearest a point', () => {
    const P = ringPerimeter(G, O)
    for (const s of [5, P * 0.3, P * 0.6, P * 0.9]) {
      const p = ringPoint(G, O, s)
      const back = ringArcAt(G, O, p.x, p.y)
      expect(Math.abs(back - s)).toBeLessThan(P / 64 + 1)
    }
  })

  it('circle count follows the perimeter within bounds', () => {
    expect(ringCircleCount(10, 2.6)).toBe(INPUT_RING_MIN)
    expect(ringCircleCount(600, 2.6)).toBeGreaterThan(200)
    expect(ringCircleCount(100000, 2.6)).toBe(240)
  })
})

describe('ring sim', () => {
  it('flows from the origin both ways and closes', () => {
    const st = createInputGooState()
    const P = ringPerimeter(G, O)
    st.shown = st.focused = true
    st.origin = ringArcAt(G, O, 0, 16) // left edge
    stepInputGoo(st, 0.08, F)
    const early = ringOf(inputRingPose(st, G, N, F).circles)
    // Near the origin is goo, the far (right) side is not yet.
    const idxAt = (s: number) => Math.floor((((s % P) + P) % P) / (P / N))
    expect(early[idxAt(st.origin)]!.r).toBeGreaterThan(0)
    expect(early[idxAt(st.origin + P / 2)]!.r).toBe(0)
    expect(shown(early)).toBeLessThan(N)
    run(st, F.flow + 0.05)
    expect(st.cover).toBe(1)
    const closed = ringOf(inputRingPose(st, G, N, F).circles)
    expect(shown(closed)).toBe(N)
  })

  it('wobbles at the close, then idles while focused', () => {
    const st = createInputGooState()
    st.shown = st.focused = true
    run(st, F.flow + 0.02)
    expect(st.closeAge).toBeLessThan(1)
    run(st, 1)
    expect(st.closeAge).toBe(Infinity)
    // Still focused: the idle wobble keeps it running.
    expect(stepInputGoo(st, 1 / 60, F)).toBe(true)
    // Without the wobble it settles.
    expect(stepInputGoo(st, 1 / 60, F, fx({ wobble: 0 }))).toBe(false)
  })

  it('drains top first on blur, then hides', () => {
    const st = createInputGooState()
    st.shown = st.focused = true
    run(st, 1, fx({ wobble: 0 }))
    st.shown = st.focused = false
    stepInputGoo(st, F.drain * 0.5, F)
    const cs = ringOf(inputRingPose(st, G, N, F).circles)
    const P = ringPerimeter(G, O)
    const at = (s: number) => cs[Math.floor(s / (P / N))]!
    expect(at(30).r).toBeLessThan(at(P / 2 + 30).r) // top thinner than bottom
    run(st, F.drain)
    expect(st.cover).toBe(0)
    expect(shown(inputRingPose(st, G, N, F).circles)).toBe(0)
  })

  it('refocus during the drain fills back in', () => {
    const st = createInputGooState()
    st.shown = true
    run(st, 1, fx({ wobble: 0 }))
    st.shown = false
    stepInputGoo(st, F.drain * 0.4, F)
    st.shown = true
    run(st, F.drain)
    expect(st.drain).toBe(0)
    expect(st.cover).toBe(1)
  })

  it('typing ripples swell the ring near the caret and die out', () => {
    const st = createInputGooState()
    st.shown = st.focused = true
    run(st, 1.6, fx({ wobble: 0 }))
    const base = ringOf(inputRingPose(st, G, N, F, fx({ wobble: 0 })).circles)
    const P = ringPerimeter(G, O)
    const s = P * 0.7
    addInputRipple(st, s)
    stepInputGoo(st, 0.1, F, fx({ wobble: 0 }))
    const rippled = ringOf(inputRingPose(st, G, N, F, fx({ wobble: 0 })).circles)
    const maxGrow = Math.max(...rippled.map((c, i) => c.r - base[i]!.r))
    expect(maxGrow).toBeGreaterThan(0.5)
    const off = ringOf(inputRingPose(st, G, N, F, fx({ wobble: 0, ripple: 0 })).circles)
    expect(Math.max(...off.map((c, i) => Math.abs(c.r - base[i]!.r)))).toBeLessThan(1e-9)
    run(st, 1, fx({ wobble: 0 }))
    expect(st.ripples).toHaveLength(0)
  })

  it('invalid grows a drip off the bottom; resting drips only when enabled', () => {
    const st = createInputGooState()
    st.shown = st.invalid = true
    run(st, 2, fx({ wobble: 0 }))
    const cs = inputRingPose(st, G, N, F).circles
    expect(cs).toHaveLength(N + INPUT_DRIP_CIRCLES)
    const drips = dripsOf(cs).filter((c) => c.r > 0)
    expect(drips.length).toBeGreaterThan(0)
    expect(Math.max(...drips.map((c) => c.y))).toBeGreaterThan(32 + O)
    expect(shown(dripsOf(cs).slice(4))).toBe(0)
    const noDrip = inputRingPose(st, G, N, F, fx({ drip: 0 })).circles
    expect(shown(dripsOf(noDrip).slice(0, 4))).toBeLessThanOrEqual(shown(dripsOf(cs).slice(0, 4)))
    const st2 = createInputGooState()
    st2.shown = true
    run(st2, 2, fx({ wobble: 0, drips: 1 }))
    expect(shown(dripsOf(inputRingPose(st2, G, N, F, fx({ drips: 1 })).circles).slice(4))).toBeGreaterThan(0)
  })

  it('reduced motion: a static closed ring, no flow or ripple', () => {
    const st = createInputGooState()
    st.shown = st.focused = true
    st.cover = 0.2
    addInputRipple(st, 10)
    const cs = ringOf(inputRingPose(st, G, N, F, fx(), true).circles)
    expect(shown(cs)).toBe(N)
    expect(new Set(cs.map((c) => c.r.toFixed(6))).size).toBe(1)
    settleInputGoo(st)
    expect(st.cover).toBe(1)
    expect(st.ripples).toHaveLength(0)
  })

  it('flow off: the ring appears closed at once', () => {
    const st = createInputGooState()
    st.shown = true
    stepInputGoo(st, 1 / 60, F, fx({ flow: 0 }))
    expect(st.cover).toBe(1)
    expect(st.closeAge).toBe(Infinity)
  })
})

describe('attachInput', () => {
  const setup = () => {
    const host = document.createElement('div')
    const field = document.createElement('input')
    host.append(field)
    document.body.append(host)
    return { host, field }
  }
  const blobs = (host: Element) => host.querySelectorAll<HTMLElement>(`[${GOOP_PART_ATTR}="blob"]`)

  it('adds one aria-hidden layer with ring + drip blobs and removes it on destroy', () => {
    const { host, field } = setup()
    const h = attachInput(host, field)
    const layers = host.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)
    expect(layers).toHaveLength(1)
    expect(layers[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(layers[0]!.getAttribute('data-goop-part')).toBe('input')
    expect(blobs(host).length).toBeGreaterThanOrEqual(INPUT_RING_MIN + INPUT_DRIP_CIRCLES)
    expect(h.state.shown).toBe(false)
    h.destroy()
    expect(host.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)).toHaveLength(0)
    expect(host.style.isolation).toBe('')
  })

  it('focus shows the ring, blur hides it', () => {
    const { host, field } = setup()
    const h = attachInput(host, field)
    field.dispatchEvent(new Event('focus'))
    expect(h.state.shown).toBe(true)
    expect(h.running).toBe(true)
    field.dispatchEvent(new Event('blur'))
    expect(h.state.shown).toBe(false)
    h.destroy()
  })

  it('follows aria-invalid and switches to the destructive color', async () => {
    const { host, field } = setup()
    const h = attachInput(host, field)
    field.setAttribute('aria-invalid', 'true')
    await new Promise((r) => setTimeout(r, 0))
    expect(h.state.invalid).toBe(true)
    expect(h.state.shown).toBe(true)
    const layer = host.querySelector<HTMLElement>(`[${GOOP_PART_ATTR}="layer"]`)!
    expect(layer.style.getPropertyValue('--goop-color')).toContain('--goop-input-invalid-color')
    h.update({ invalid: false })
    expect(h.state.invalid).toBe(false)
    h.destroy()
  })

  it('reduced motion: focus draws the closed ring immediately and never runs', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { host, field } = setup()
    const h = attachInput(host, field)
    field.dispatchEvent(new Event('focus'))
    expect(h.reducedMotion).toBe(true)
    expect(h.running).toBe(false)
    expect(h.state.cover).toBe(1)
    expect(h.pose!.coverage).toBe(1)
    h.ripple()
    expect(h.state.ripples).toHaveLength(0)
    h.destroy()
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  STEPPER_CIRCLES,
  STEPPER_DEFAULT_EFFECTS,
  STEPPER_FEEL,
  attachNumberField,
  createStepperState,
  nudgeEnvelope,
  settleStepper,
  stepStepper,
  stepperPose,
  type StepperButton,
  type StepperState,
} from '../src'

const F = STEPPER_FEEL.playful
const DEC: StepperButton = { x: 0, y: -4, w: 40, h: 40, out: -1 }
const INC: StepperButton = { x: 160, y: -4, w: 40, h: 40, out: 1 }
const run = (st: StepperState, secs: number, e = STEPPER_DEFAULT_EFFECTS) => {
  for (let t = 0; t < secs; t += 1 / 60) stepStepper(st, 1 / 60, F, e)
}
const visible = (st: StepperState, e = STEPPER_DEFAULT_EFFECTS, reduced = false) =>
  stepperPose(st, [DEC, INC], F, e, reduced).filter((c) => c.r > 0)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('stepper pose', () => {
  it('hidden at rest; a press swells a flattened, wide dollop under the button', () => {
    const st = createStepperState()
    expect(visible(st)).toHaveLength(0)
    st.buttons[1].down = true
    run(st, 0.3)
    const cs = stepperPose(st, [DEC, INC], F)
    expect(cs).toHaveLength(2 * STEPPER_CIRCLES)
    const dollop = cs[STEPPER_CIRCLES]!
    expect(dollop.r).toBeGreaterThan(5)
    expect(dollop.x).toBeCloseTo(INC.x + INC.w / 2)
    // Low and wide.
    expect(dollop.sx).toBeGreaterThan(1)
    expect(dollop.sy).toBeLessThan(1)
    expect(cs[0]!.r).toBe(0)
  })

  it('release springs back with a wobble and shrinks away', () => {
    const st = createStepperState()
    st.buttons[0].down = true
    run(st, 0.3)
    st.buttons[0].down = false
    st.buttons[0].rel = 0
    expect(stepStepper(st, 1 / 60, F)).toBe(true)
    run(st, 1)
    expect(visible(st)).toHaveLength(0)
    expect(stepStepper(st, 1 / 60, F)).toBe(false)
  })

  it('a nudge shoves the dollop toward its side, then settles', () => {
    expect(nudgeEnvelope(0, 0.36)).toBe(0)
    expect(nudgeEnvelope(0.36, 0.36)).toBe(0)
    const st = createStepperState()
    st.buttons[1].kick = 0.08
    const right = stepperPose(st, [DEC, INC], F)[STEPPER_CIRCLES]!
    expect(right.r).toBeGreaterThan(0)
    expect(right.x).toBeGreaterThan(INC.x + INC.w / 2)
    const left = createStepperState()
    left.buttons[0].kick = 0.08
    expect(stepperPose(left, [DEC, INC], F)[0]!.x).toBeLessThan(DEC.x + DEC.w / 2)
    run(st, 1)
    expect(st.buttons[1].kick).toBe(Infinity)
    expect(visible(st)).toHaveLength(0)
  })

  it('toggles: squish off keeps the dollop round, nudge off never shoves', () => {
    const st = createStepperState()
    st.buttons[1].down = true
    run(st, 0.3)
    const round = stepperPose(st, [DEC, INC], F, { squish: 0, nudge: 1 })[STEPPER_CIRCLES]!
    expect(round.sx).toBe(1)
    expect(round.sy).toBe(1)
    const k = createStepperState()
    k.buttons[1].kick = 0.08
    expect(visible(k, { squish: 1, nudge: 0 })).toHaveLength(0)
  })

  it('reduced motion: a static round dollop while pressed, no nudge', () => {
    const st = createStepperState()
    st.buttons[1].down = true
    st.buttons[1].kick = 0.1
    settleStepper(st)
    expect(st.buttons[1].p).toBe(1)
    expect(st.buttons[1].kick).toBe(Infinity)
    const d = stepperPose(st, [DEC, INC], F, STEPPER_DEFAULT_EFFECTS, true)[STEPPER_CIRCLES]!
    expect(d.r).toBeGreaterThan(0)
    expect(d.sx).toBe(1)
    expect(d.x).toBeCloseTo(INC.x + INC.w / 2)
  })
})

describe('attachNumberField', () => {
  const setup = () => {
    const host = document.createElement('div')
    const dec = document.createElement('button')
    dec.dataset.slot = 'decrement'
    const field = document.createElement('input')
    const inc = document.createElement('button')
    inc.dataset.slot = 'increment'
    host.append(dec, field, inc)
    document.body.append(host)
    return { host, field, dec, inc }
  }
  const layers = (host: Element) => host.querySelectorAll<HTMLElement>(`[${GOOP_PART_ATTR}="layer"]`)

  it('adds the ring and stepper layers (aria-hidden) and removes both on destroy', () => {
    const { host, field } = setup()
    const h = attachNumberField(host, field)
    const ls = layers(host)
    expect(ls).toHaveLength(2)
    for (const l of ls) expect(l.getAttribute('aria-hidden')).toBe('true')
    expect([...ls].map((l) => l.getAttribute('data-goop-part'))).toEqual(['input', 'number-field-stepper'])
    h.destroy()
    expect(layers(host)).toHaveLength(0)
  })

  it('pressing a button squishes its dollop; pointerup releases it', () => {
    const { host, field, inc } = setup()
    const h = attachNumberField(host, field)
    inc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    expect(h.state.buttons[1].down).toBe(true)
    expect(h.running).toBe(true)
    window.dispatchEvent(new PointerEvent('pointerup'))
    expect(h.state.buttons[1].down).toBe(false)
    expect(h.state.buttons[1].rel).toBe(0)
    h.destroy()
  })

  it('a disabled button does not squish', () => {
    const { host, field, dec } = setup()
    dec.setAttribute('disabled', '')
    const h = attachNumberField(host, field)
    dec.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    expect(h.state.buttons[0].down).toBe(false)
    h.destroy()
  })

  it('nudge kicks the side it came from and ripples the focused ring; typing commits do not', () => {
    const { host, field } = setup()
    const h = attachNumberField(host, field)
    field.dispatchEvent(new Event('focus'))
    h.nudge(1)
    expect(h.state.buttons[1].kick).toBe(0)
    expect(h.input.state.ripples.length).toBe(1)
    h.nudge(-1)
    expect(h.state.buttons[0].kick).toBe(0)
    // Typed value committing: not a step.
    field.dispatchEvent(new Event('input'))
    h.state.buttons[1].kick = Infinity
    h.nudge(1)
    expect(h.state.buttons[1].kick).toBe(Infinity)
    h.destroy()
  })

  it('nudge off: no kick, no ripple, even with the ring ripple on', () => {
    const { host, field } = setup()
    const h = attachNumberField(host, field, { nudge: false })
    field.dispatchEvent(new Event('focus'))
    h.nudge(1)
    expect(h.state.buttons[1].kick).toBe(Infinity)
    expect(h.input.state.ripples).toHaveLength(0)
    // Ring ripple off doesn't stop the nudge's own ripple.
    h.update({ nudge: true, ripple: false })
    h.nudge(1)
    expect(h.input.state.ripples).toHaveLength(1)
    h.destroy()
  })

  it('reduced motion: static press, no nudge, never runs', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { host, field, inc } = setup()
    const h = attachNumberField(host, field)
    inc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    expect(h.reducedMotion).toBe(true)
    expect(h.running).toBe(false)
    expect(h.state.buttons[1].p).toBe(1)
    h.nudge(1)
    expect(h.state.buttons[1].kick).toBe(Infinity)
    h.destroy()
  })
})

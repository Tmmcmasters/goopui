import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  OTP_DEFAULT_EFFECTS,
  OTP_MAX_PULSES,
  OTP_PULSE_CIRCLES,
  OTP_PULSE_FEEL,
  TOGGLE_FEEL,
  attachInputOTP,
  otpFillRect,
  otpPose,
  otpPulseCircles,
  type GooCircle,
  type ToggleAnim,
  type ToggleRect,
} from '../src'

const feel = TOGGLE_FEEL.playful
const cells: ToggleRect[] = [0, 1, 2].map((i) => ({ x: i * 32, y: 0, w: 32, h: 32 }))
const full: ToggleAnim = { on: true, origin: { x: 16, y: 16 }, start: -100, from: 1, splash: false }
const empty: ToggleAnim = { on: false, origin: { x: 16, y: 16 }, start: -100, from: 0, splash: false }
const visible = (cs: GooCircle[]) => cs.filter((c) => c.r > 0)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('otp pose', () => {
  it('fills only the focused cell, inside its border', () => {
    const pose = otpPose(cells, [empty, full, empty], [], [], 0, feel)
    expect(pose.levels).toEqual([0, 1, 0])
    const fill = otpFillRect(cells[1]!)
    for (const c of visible(pose.circles)) {
      expect(c.x).toBeGreaterThanOrEqual(fill.x)
      expect(c.x).toBeLessThanOrEqual(fill.x + fill.w)
    }
    // Trailing pulse slots are always there (empty).
    expect(pose.circles.slice(-OTP_MAX_PULSES * OTP_PULSE_CIRCLES).every((c) => c.r === 0)).toBe(true)
  })

  it('a pulse swells low and wide in its cell and is gone by the end', () => {
    const rect = otpFillRect(cells[0]!)
    const life = OTP_PULSE_FEEL.playful.life
    const mid = otpPulseCircles({ index: 0, start: 0 }, rect, life * 0.3)
    expect(mid[0]!.r).toBeGreaterThan(3)
    expect(mid[0]!.sx).toBeGreaterThan(mid[0]!.sy)
    expect(otpPulseCircles({ index: 0, start: 0 }, rect, life).every((c) => c.r === 0)).toBe(true)
    // pulse off
    expect(otpPulseCircles({ index: 0, start: 0 }, rect, life * 0.3, OTP_PULSE_FEEL.playful, 0).every((c) => c.r === 0)).toBe(true)
  })

  it('pulse effect off draws no pulse circles', () => {
    const pose = otpPose(cells, [empty, empty, empty], [], [{ index: 0, start: 0 }], 0.1, feel, { ...OTP_DEFAULT_EFFECTS, pulse: 0 })
    expect(visible(pose.circles)).toHaveLength(0)
  })
})

describe('attachInputOTP', () => {
  const setup = (n = 6) => {
    const host = document.createElement('div')
    const inputs = Array.from({ length: n }, () => {
      const i = document.createElement('input')
      i.dataset.slot = 'input-otp-slot'
      host.append(i)
      return i
    })
    document.body.append(host)
    return { host, inputs }
  }

  it('adds one aria-hidden layer and removes it on destroy', () => {
    const { host } = setup()
    const h = attachInputOTP(host)
    const layer = host.querySelector(`[${GOOP_PART_ATTR}="layer"]`)!
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.getAttribute('data-goop-part')).toBe('input-otp')
    h.destroy()
    expect(host.querySelector(`[${GOOP_PART_ATTR}="layer"]`)).toBeNull()
  })

  it('the focus goo follows focus from cell to cell (forward on typing, back on delete)', () => {
    const { host, inputs } = setup()
    const h = attachInputOTP(host)
    expect(h.active).toBe(-1)
    inputs[0]!.focus()
    expect(h.active).toBe(0)
    expect(h.running).toBe(true)
    inputs[1]!.focus()
    expect(h.active).toBe(1)
    inputs[0]!.focus()
    expect(h.active).toBe(0)
    inputs[0]!.blur()
    expect(h.active).toBe(-1)
    h.destroy()
  })

  it('a digit landing pulses its cell; deletes do not', () => {
    const { host, inputs } = setup()
    const h = attachInputOTP(host)
    inputs[0]!.focus()
    inputs[0]!.value = '4'
    inputs[0]!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '4' }))
    expect(h.running).toBe(true)
    // Pulse circles show in cell 0 shortly after (happy-dom rects are 0, so just count them).
    h.destroy()
    const b = setup()
    const h2 = attachInputOTP(b.host, { pulse: false, flood: false, flow: false, wobble: false })
    b.inputs[0]!.value = '4'
    b.inputs[0]!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '4' }))
    expect(h2.running).toBe(false)
    h2.destroy()
  })

  it('reduced motion: a static fill in the focused cell, never runs', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { host, inputs } = setup()
    const h = attachInputOTP(host)
    inputs[2]!.focus()
    expect(h.reducedMotion).toBe(true)
    expect(h.running).toBe(false)
    expect(h.pose!.levels[2]).toBe(1)
    h.pulse(2)
    expect(h.running).toBe(false)
    h.destroy()
  })
})

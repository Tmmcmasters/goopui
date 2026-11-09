import { afterEach, describe, expect, it } from 'vitest'
import { FIELD_ERROR_CIRCLES, FIELD_ERROR_EFFECTS, FIELD_ERROR_FEEL, attachFieldError, fieldErrorPose } from '../src'

const F = FIELD_ERROR_FEEL.playful

afterEach(() => {
  document.body.innerHTML = ''
})

describe('fieldErrorPose', () => {
  it('has drip and reveal', () => {
    expect([...FIELD_ERROR_EFFECTS]).toEqual(['drip', 'reveal'])
  })

  it('the drop starts above the top edge on a neck, falls into the first line and spreads flat', () => {
    const a = fieldErrorPose(0, 8, 20, 20, F)
    expect(a.circles).toHaveLength(FIELD_ERROR_CIRCLES)
    expect(a.circles[0]!.y).toBeLessThan(0)
    expect(a.circles[0]!.r).toBeCloseTo(F.drop)
    const landed = fieldErrorPose(0.5, 8, 20, 20, F)
    expect(landed.circles[0]!.y).toBeCloseTo(10)
    expect(landed.circles.slice(1).every((c) => c.r === 0)).toBe(true)
    const late = fieldErrorPose(0.9, 8, 20, 20, F)
    expect(late.circles[0]!.sx).toBeGreaterThan(1.5)
    expect(late.circles[0]!.sy).toBeLessThan(0.7)
    const end = fieldErrorPose(1, 8, 20, 20, F)
    expect(end.opacity).toBe(0)
    expect(end.reveal).toBe(Infinity)
  })

  it('gentle: the drop stays small and close to the edge', () => {
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      const f = FIELD_ERROR_FEEL[p]
      expect(f.drop).toBeLessThanOrEqual(4)
      expect(f.lift).toBeLessThanOrEqual(6)
      expect(fieldErrorPose(0, 8, 20, 20, f).circles[0]!.y).toBeGreaterThanOrEqual(-6)
    }
  })

  it('the unroll trails the drop, then opens everything', () => {
    const a = fieldErrorPose(0.25, 8, 40, 20, F)
    expect(a.reveal).toBeLessThan(40)
    expect(a.reveal).toBeGreaterThanOrEqual(a.circles[0]!.y)
    expect(fieldErrorPose(0.25, 8, 40, 20, F, 1, 0).reveal).toBe(Infinity)
    // No drop: no circles.
    expect(fieldErrorPose(0.25, 8, 40, 20, F, 0).circles.every((c) => c.r === 0)).toBe(true)
  })
})

function sized(): HTMLElement {
  const el = document.createElement('div')
  el.textContent = 'Required'
  Object.defineProperty(el, 'offsetHeight', { value: 20 })
  Object.defineProperty(el, 'offsetWidth', { value: 200 })
  document.body.append(el)
  return el
}

describe('attachFieldError', () => {
  it('needs a laid-out box (nothing plays without one) and cleans up', () => {
    const el = document.createElement('div')
    el.textContent = 'Required'
    document.body.append(el)
    const h = attachFieldError(el, { reducedMotion: false })
    expect(h.running).toBe(false)
    expect(el.style.clipPath).toBe('')
    h.destroy()
  })

  it('plays when it has a box, then restores the element', () => {
    const el = sized()
    const h = attachFieldError(el, { reducedMotion: false })
    expect(h.running).toBe(true)
    expect(el.querySelector('[data-goop-part="field-error"]')).not.toBeNull()
    expect(el.style.clipPath).toMatch(/^inset\(/)
    expect(el.hasAttribute('data-goop-dripping')).toBe(true)
    h.destroy()
    expect(el.querySelector('[data-goop-part="field-error"]')).toBeNull()
    expect(el.style.clipPath).toBe('')
    expect(el.style.position).toBe('')
    expect(el.hasAttribute('data-goop-dripping')).toBe(false)
  })

  it('reduced motion or both effects off: nothing plays', () => {
    expect(attachFieldError(sized(), { reducedMotion: true }).running).toBe(false)
    expect(attachFieldError(sized(), { drip: false, reveal: false, reducedMotion: false }).running).toBe(false)
  })

  it('reveal only: no goo layer, just the unroll', () => {
    const el = sized()
    const h = attachFieldError(el, { drip: false, reducedMotion: false })
    expect(h.running).toBe(true)
    expect(el.querySelector('[data-goop-part="field-error"]')).toBeNull()
    expect(el.style.clipPath).toMatch(/^inset\(/)
    h.destroy()
  })
})

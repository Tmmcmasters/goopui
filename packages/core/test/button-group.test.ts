import { afterEach, describe, expect, it } from 'vitest'
import { BUTTON_GROUP_EFFECTS, BUTTON_GROUP_FEEL, activeTickerCount, attachButtonGroup, buttonGroupPose } from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const f = BUTTON_GROUP_FEEL.playful
const frames = (n: number) => new Promise((r) => setTimeout(r, n * 17))

describe('button group pose', () => {
  it('the pressed button squishes across and spreads along; neighbours lean in from their far edge', () => {
    const pressed = buttonGroupPose(1, 1, 1, 80, f)
    expect(pressed.across).toBeCloseTo(1 - f.squish)
    expect(pressed.along).toBeCloseTo(1 + f.spread)
    expect(pressed.origin).toBe(0.5)
    const left = buttonGroupPose(0, 1, 1, 80, f)
    const right = buttonGroupPose(2, 1, 1, 80, f)
    expect(left.origin).toBe(0)
    expect(right.origin).toBe(1)
    // The near edge moves `pull` px toward the pressed one.
    expect((left.along - 1) * 80).toBeCloseTo(f.pull)
    expect(left.across).toBeLessThan(1)
    expect(left.across).toBeGreaterThan(pressed.across)
    // Further neighbours get less.
    const far = buttonGroupPose(3, 1, 1, 80, f)
    expect((far.along - 1) * 80).toBeCloseTo(f.pull * f.falloff)
  })

  it('no seams: along the axis nothing ever shrinks, at any depth', () => {
    for (let p = -0.5; p <= 1.2; p += 0.05)
      for (let i = 0; i < 4; i++) expect(buttonGroupPose(i, 1, p, 60, f).along).toBeGreaterThanOrEqual(1)
  })

  it('toggles: press 0 keeps the pressed one still, tug 0 the neighbours; rest when p = 0', () => {
    expect(buttonGroupPose(1, 1, 1, 80, f, 0, 1)).toEqual({ along: 1, across: 1, origin: 0.5 })
    expect(buttonGroupPose(0, 1, 1, 80, f, 1, 0)).toEqual({ along: 1, across: 1, origin: 0.5 })
    expect(buttonGroupPose(0, 1, 0, 80, f)).toEqual({ along: 1, across: 1, origin: 0.5 })
    expect([...BUTTON_GROUP_EFFECTS]).toEqual(['press', 'tug'])
    expect(BUTTON_GROUP_FEEL.wild.pull).toBeGreaterThan(BUTTON_GROUP_FEEL.subtle.pull)
  })
})

describe('attachButtonGroup', () => {
  const group = (orientation = 'horizontal') => {
    const g = document.createElement('div')
    g.setAttribute('role', 'group')
    g.setAttribute('data-orientation', orientation)
    g.innerHTML = '<button>A</button><button>B</button><button disabled>C</button><span>text</span>'
    for (const c of g.children) {
      Object.defineProperty(c, 'offsetWidth', { get: () => 80 })
      Object.defineProperty(c, 'offsetHeight', { get: () => 36 })
    }
    document.body.append(g)
    return g
  }

  it('a press squishes the button and tugs its neighbour, then everything rests', async () => {
    const g = group()
    const h = attachButtonGroup(g)
    const [a, b] = g.querySelectorAll('button')
    b!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    expect(h.pressed).toBe(1)
    await frames(5)
    expect(b!.style.transform).toContain('scale(')
    expect(a!.style.transformOrigin).toBe('0% 50%')
    window.dispatchEvent(new PointerEvent('pointerup'))
    await frames(90)
    expect(a!.style.transform).toBe('')
    expect(b!.style.transform).toBe('')
    expect(activeTickerCount()).toBe(0)
    h.destroy()
  })

  it('vertical groups flex along y; disabled buttons and text never start a press', () => {
    const g = group('vertical')
    const h = attachButtonGroup(g)
    g.querySelectorAll('button')[2]!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    g.querySelector('span')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(h.pressed).toBe(-1)
    h.press(0)
    expect(h.pressed).toBe(0)
    h.destroy()
  })

  it('Space presses the focused button; reduced motion keeps it static', () => {
    const g = group()
    const h = attachButtonGroup(g)
    g.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(h.pressed).toBe(0)
    h.destroy()
    document.documentElement.dataset.reducedMotion = 'true'
    const g2 = group()
    const h2 = attachButtonGroup(g2)
    g2.querySelector('button')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(h2.pressed).toBe(-1)
    expect(activeTickerCount()).toBe(0)
  })
})

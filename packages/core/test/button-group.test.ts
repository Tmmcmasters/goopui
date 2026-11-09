import { afterEach, describe, expect, it } from 'vitest'
import {
  BUTTON_GROUP_BULGE_CIRCLES,
  BUTTON_GROUP_EFFECTS,
  BUTTON_GROUP_FEEL,
  BUTTON_GROUP_GOO_CIRCLES,
  BUTTON_GROUP_HIGHLIGHT_ATTR,
  BUTTON_GROUP_LIT_ATTR,
  activeTickerCount,
  attachButtonGroup,
  buttonGroupGooPose,
  buttonGroupPose,
} from '../src'

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
    expect([...BUTTON_GROUP_EFFECTS]).toEqual(['press', 'tug', 'highlight', 'wobble', 'momentum', 'followPointer', 'bulge', 'ripple'])
    expect(BUTTON_GROUP_FEEL.wild.pull).toBeGreaterThan(BUTTON_GROUP_FEEL.subtle.pull)
  })
})

describe('button group goo pose', () => {
  const rect = { x: 80, y: 0, width: 80, height: 36 }
  const base = { pressed: rect, start: 0, end: 240, vertical: false, depth: 1, ripple: 1 }

  it('nothing pressed: no goo; always BUTTON_GROUP_GOO_CIRCLES circles', () => {
    const none = buttonGroupGooPose({ ...base, pressed: null })
    expect(none).toHaveLength(BUTTON_GROUP_GOO_CIRCLES)
    expect(none.every((c) => c.r === 0)).toBe(true)
  })

  it('the bulge is a low, wide mound past the edges: peak `bulge` px, centred, tapering', () => {
    const c = buttonGroupGooPose(base, f).slice(0, BUTTON_GROUP_BULGE_CIRCLES)
    const lit = c.filter((k) => k.r > 0)
    expect(lit.length).toBeGreaterThanOrEqual(7)
    const top = Math.max(...lit.map((k) => k.r - k.y))
    expect(top).toBeLessThanOrEqual(f.bulge + 0.01)
    expect(top).toBeGreaterThan(f.bulge * 0.9)
    // Peak in the middle of the button; spread across most of it (wide, not a knob).
    const peak = lit.reduce((a, b) => (b.r - b.y > a.r - a.y ? b : a))
    expect(peak.x).toBeCloseTo(120, 0)
    // Never past the button's ends along the group, nor more than `bulge` past its long edges.
    for (const k of lit) {
      expect(k.x - k.r).toBeGreaterThanOrEqual(80 - 0.01)
      expect(k.x + k.r).toBeLessThanOrEqual(160 + 0.01)
      expect(k.y + k.r).toBeLessThanOrEqual(36 + f.bulge + 0.01)
    }
    // A square icon button: still inside its own ends (a swell on two sides, not a ball).
    for (const k of buttonGroupGooPose({ ...base, pressed: { x: 80, y: 0, width: 36, height: 36 } }, f).slice(0, BUTTON_GROUP_BULGE_CIRCLES))
      if (k.r > 0) {
        expect(k.x - k.r).toBeGreaterThanOrEqual(80 - 0.01)
        expect(k.x + k.r).toBeLessThanOrEqual(116 + 0.01)
      }
    expect(Math.max(...lit.map((k) => k.x + k.r)) - Math.min(...lit.map((k) => k.x - k.r))).toBeGreaterThan(60)
    // Low: never more than a few px past the edge at any preset.
    for (const p of ['subtle', 'playful', 'wild'] as const) expect(BUTTON_GROUP_FEEL[p].bulge).toBeLessThanOrEqual(5)
  })

  it('bulge follows depth and strength; 0 turns it off', () => {
    const at = (depth: number, s = 1) =>
      Math.max(0, ...buttonGroupGooPose({ ...base, depth, bulgeStrength: s, ripple: 1 }, f).filter((k) => k.r > 0).map((k) => k.r - k.y))
    expect(at(0)).toBe(0)
    expect(at(0.5)).toBeLessThan(at(1))
    expect(at(1, 0)).toBe(0)
    expect(at(1, 2)).toBeGreaterThan(at(1))
    expect(at(-0.3)).toBe(0)
  })

  it('the ripple leaves both ends, travels into the neighbours and thins away inside the group', () => {
    const lumps = (ripple: number) => buttonGroupGooPose({ ...base, depth: 0, ripple }, f).slice(BUTTON_GROUP_BULGE_CIRCLES)
    const early = lumps(0.1)
    const late = lumps(0.8)
    expect(early[0]!.x).toBeLessThan(80 + 18)
    expect(early[3]!.x).toBeGreaterThan(160 - 18)
    expect(late[0]!.x).toBeLessThan(early[0]!.x)
    expect(late[3]!.x).toBeGreaterThan(early[3]!.x)
    expect(late[0]!.r).toBeLessThan(early[0]!.r)
    for (const u of [0, 0.3, 0.6, 0.95]) for (const k of lumps(u)) if (k.r > 0) {
      expect(k.x - k.r).toBeGreaterThanOrEqual(-0.01)
      expect(k.x + k.r).toBeLessThanOrEqual(240.01)
    }
    expect(lumps(1).every((k) => k.r === 0)).toBe(true)
    expect(buttonGroupGooPose({ ...base, depth: 0, ripple: 0.3, rippleStrength: 0 }).every((k) => k.r === 0)).toBe(true)
    // An end button sends goo only one way.
    const end = buttonGroupGooPose({ ...base, pressed: { ...rect, x: 0 }, depth: 0, ripple: 0.3 }).slice(BUTTON_GROUP_BULGE_CIRCLES)
    expect(end[0]!.r).toBe(0)
    expect(end[3]!.r).toBeGreaterThan(0)
  })

  it('vertical groups bulge sideways and ripple along y', () => {
    const v = buttonGroupGooPose({ pressed: { x: 0, y: 36, width: 80, height: 36 }, start: 0, end: 108, vertical: true, depth: 1, ripple: 0.4 }, f)
    const bulge = v.slice(0, BUTTON_GROUP_BULGE_CIRCLES).filter((k) => k.r > 0)
    // Rows along the left and right edges, poking out sideways only.
    expect(Math.min(...bulge.map((k) => k.x - k.r))).toBeLessThan(0)
    expect(Math.max(...bulge.map((k) => k.x + k.r))).toBeGreaterThan(80)
    for (const k of bulge) expect(k.y - k.r).toBeGreaterThanOrEqual(36 - 0.01)
    const lumps = v.slice(BUTTON_GROUP_BULGE_CIRCLES)
    expect(lumps[0]!.y).toBeLessThan(lumps[3]!.y)
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

  it('one goo layer, appended last; hover lights a button, text clears it, leaving the group hides it', () => {
    const g = group()
    const h = attachButtonGroup(g)
    const layer = g.lastElementChild as HTMLElement
    expect(layer.getAttribute('data-goop')).toBe('highlight')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(h.element).toBe(layer)
    expect(g.firstElementChild!.tagName).toBe('BUTTON')
    expect(g.hasAttribute(BUTTON_GROUP_HIGHLIGHT_ATTR)).toBe(true)
    const [a, b] = g.querySelectorAll('button')
    b!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(h.lit).toBe(1)
    expect(b!.hasAttribute(BUTTON_GROUP_LIT_ATTR)).toBe(true)
    a!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(h.lit).toBe(0)
    g.querySelector('span')!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(h.lit).toBe(-1)
    // Disabled buttons are never lit.
    g.querySelectorAll('button')[2]!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(h.lit).toBe(-1)
    h.light(0)
    g.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    expect(h.lit).toBe(-1)
    h.destroy()
    expect(g.querySelector('[data-goop]')).toBeNull()
    expect(g.hasAttribute(BUTTON_GROUP_HIGHLIGHT_ATTR)).toBe(false)
    expect(a!.hasAttribute(BUTTON_GROUP_LIT_ATTR)).toBe(false)
  })

  it('touch: no sticky hover; the blob shows only while pressed', () => {
    const g = group()
    const h = attachButtonGroup(g)
    const b = g.querySelectorAll('button')[1]!
    b.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))
    expect(h.lit).toBe(-1)
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'touch' }))
    expect(h.lit).toBe(1)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch' }))
    expect(h.lit).toBe(-1)
    h.destroy()
  })

  it('every goo effect off: no layer; the flex alone still works; update brings it back', () => {
    const g = group()
    const h = attachButtonGroup(g, { highlight: false, bulge: false, ripple: false })
    expect(g.querySelector('[data-goop]')).toBeNull()
    expect(h.element).toBeNull()
    h.press(0)
    expect(h.pressed).toBe(0)
    h.update({ highlight: false })
    expect(g.querySelector('[data-goop="highlight"]')).not.toBeNull()
    expect(g.hasAttribute(BUTTON_GROUP_HIGHLIGHT_ATTR)).toBe(false)
    h.update({})
    expect(g.hasAttribute(BUTTON_GROUP_HIGHLIGHT_ATTR)).toBe(true)
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
    // Reduced motion: the highlight is static (snaps, no ticking).
    const b2 = g2.querySelectorAll('button')[1]!
    b2.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(h2.lit).toBe(1)
    expect(activeTickerCount()).toBe(0)
    h2.destroy()
  })
})

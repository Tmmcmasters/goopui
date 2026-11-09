import { afterEach, describe, expect, it } from 'vitest'
import {
  BUTTON_GROUP_EFFECTS,
  BUTTON_GROUP_FEEL,
  GOOP_SEAMS_ATTR,
  activeTickerCount,
  attachButtonGroup,
  attachGoop,
  buttonGroupPose,
  buttonGroupSeams,
  goopSeamClip,
  parseGoopSeams,
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
    expect([...BUTTON_GROUP_EFFECTS]).toEqual(['seams', 'press', 'tug'])
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
    const h = attachButtonGroup(g, { press: true, tug: true })
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
    const h = attachButtonGroup(g, { press: true })
    g.querySelectorAll('button')[2]!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    g.querySelector('span')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(h.pressed).toBe(-1)
    h.press(0)
    expect(h.pressed).toBe(0)
    h.destroy()
  })

  it('Space presses the focused button; reduced motion keeps it static', () => {
    const g = group()
    const h = attachButtonGroup(g, { press: true })
    g.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(h.pressed).toBe(0)
    h.destroy()
    document.documentElement.dataset.reducedMotion = 'true'
    const g2 = group()
    const h2 = attachButtonGroup(g2, { press: true, tug: true })
    g2.querySelector('button')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(h2.pressed).toBe(-1)
    expect(activeTickerCount()).toBe(0)
  })
})

describe('button group seams', () => {
  const el = (html: string): Element[] => {
    const d = document.createElement('div')
    d.innerHTML = html
    return [...d.children]
  }

  it('mirrors shadcn: inner members join both sides, the ends one; vertical uses top / bottom', () => {
    const m = el('<button data-slot="button"></button><button data-slot="button"></button><button data-slot="button"></button>')
    expect(buttonGroupSeams(m)).toEqual([{ right: true }, { left: true, right: true }, { left: true }])
    expect(buttonGroupSeams(m, 'vertical')).toEqual([{ bottom: true }, { top: true, bottom: true }, { top: true }])
    // The last slotted member stays round when only an unslotted helper follows it.
    const sel = el('<button data-slot="select-trigger"></button><select aria-hidden="true"></select>')
    expect(buttonGroupSeams(sel)).toEqual([{}, { left: true }])
    // A group of groups is spaced (gap-2): nothing joins.
    const nested = el('<div data-slot="button-group"></div><div data-slot="button-group"></div>')
    expect(buttonGroupSeams(nested)).toEqual([{}, {}])
  })

  it('marks members (on by default), follows added members and orientation, unmarks on destroy', async () => {
    const g = document.createElement('div')
    g.setAttribute('data-orientation', 'horizontal')
    g.innerHTML = '<button data-slot="button">A</button><button data-slot="button">B</button>'
    document.body.append(g)
    const h = attachButtonGroup(g)
    const [a, b] = g.querySelectorAll('button')
    expect(a!.getAttribute(GOOP_SEAMS_ATTR)).toBe('right')
    expect(b!.getAttribute(GOOP_SEAMS_ATTR)).toBe('left')
    // Default: no whole-button squish (each button's own goo presses).
    b!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    expect(h.pressed).toBe(-1)
    const c = document.createElement('button')
    c.setAttribute('data-slot', 'button')
    g.append(c)
    await new Promise((r) => setTimeout(r, 0))
    expect(b!.getAttribute(GOOP_SEAMS_ATTR)).toBe('right left')
    expect(c.getAttribute(GOOP_SEAMS_ATTR)).toBe('left')
    g.setAttribute('data-orientation', 'vertical')
    await new Promise((r) => setTimeout(r, 0))
    expect(a!.getAttribute(GOOP_SEAMS_ATTR)).toBe('bottom')
    h.update({ seams: false })
    expect(a!.hasAttribute(GOOP_SEAMS_ATTR)).toBe(false)
    h.update({})
    expect(a!.getAttribute(GOOP_SEAMS_ATTR)).toBe('bottom')
    h.destroy()
    expect(b!.hasAttribute(GOOP_SEAMS_ATTR)).toBe(false)
    // A late update (React effects after cleanup) or queued mutation never marks again.
    h.update({})
    g.append(document.createElement('button'))
    await new Promise((r) => setTimeout(r, 0))
    expect(b!.hasAttribute(GOOP_SEAMS_ATTR)).toBe(false)
  })

  it('parses marks and builds a clip that only cuts the neighbour band', () => {
    expect(parseGoopSeams('left  right nope')).toEqual({ left: true, right: true })
    expect(goopSeamClip({})).toBe('')
    const clip = goopSeamClip({ right: true }, 3)
    expect(clip.startsWith('polygon(')).toBe(true)
    expect(clip).toContain('calc(100% + 1px + var(--goop-seam-outset, 0px)) -3px')
    expect(clip).not.toContain('calc(0px - var(--goop-seam-outset, 0px))')
  })

  it('attachGoop seams: cuts the host, extends the body, no drips from a joined bottom, restores', async () => {
    const host = document.createElement('button')
    host.style.clipPath = 'none'
    Object.defineProperty(host, 'offsetWidth', { get: () => 80 })
    Object.defineProperty(host, 'offsetHeight', { get: () => 32 })
    host.setAttribute(GOOP_SEAMS_ATTR, 'left right')
    document.body.append(host)
    const h = attachGoop(host, { seams: true, random: () => 0.5 })
    expect(host.style.clipPath).toContain('polygon(')
    expect(Number.parseFloat(host.style.getPropertyValue('--goop-seam-bleed'))).toBeGreaterThan(8)
    const body = host.querySelector('[data-goop="body"]') as HTMLElement
    expect(Number.parseFloat(body.style.left)).toBeLessThan(Number.parseFloat(body.style.top))
    // Vertical member joined below: hover drips stay off.
    host.setAttribute(GOOP_SEAMS_ATTR, 'bottom')
    await new Promise((r) => setTimeout(r, 0))
    h.drip(40)
    expect(h.inspect().drips).toBe(0)
    host.removeAttribute(GOOP_SEAMS_ATTR)
    await new Promise((r) => setTimeout(r, 0))
    expect(host.style.clipPath).toBe('none')
    h.drip(40)
    expect(h.inspect().drips).toBe(1)
    host.setAttribute(GOOP_SEAMS_ATTR, 'top')
    await new Promise((r) => setTimeout(r, 0))
    h.destroy()
    expect(host.style.clipPath).toBe('none')
    expect(host.style.getPropertyValue('--goop-seam-bleed')).toBe('')
  })

  it('attachGoop without seams ignores the attribute', () => {
    const host = document.createElement('button')
    host.setAttribute(GOOP_SEAMS_ATTR, 'left right')
    document.body.append(host)
    const h = attachGoop(host)
    expect(host.style.clipPath).toBe('')
    h.destroy()
  })
})

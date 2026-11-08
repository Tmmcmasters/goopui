import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  MENU_HIGHLIGHT_CIRCLES,
  NAVIGATION_MENU_EFFECTS,
  NAVIGATION_MENU_FEEL,
  NAVIGATION_MENU_ITEM_ATTR,
  NAVIGATION_MENU_JELLY,
  NAVIGATION_MENU_SCOPE_ATTR,
  NAVIGATION_MENU_VIEWPORT_VARS,
  TABS_FEEL,
  activeTickerCount,
  attachNavigationMenuHighlight,
  attachNavigationMenuViewport,
  findNavigationMenuHighlight,
  navigationMenuJellyBox,
  navigationMenuJellyInit,
  navigationMenuJellySettled,
  navigationMenuJellyStep,
  type NavigationMenuBox,
} from '../src'

const DT = 1 / 60
const A: NavigationMenuBox = { left: 0, width: 300, height: 200 }
const B: NavigationMenuBox = { left: 120, width: 420, height: 160 }

const run = (wobble = true, preset: keyof typeof NAVIGATION_MENU_JELLY = 'playful') => {
  const s = navigationMenuJellyInit(A)
  const frames: NavigationMenuBox[] = []
  for (let t = 0; t < 3; t += DT) {
    navigationMenuJellyStep(s, B, DT, NAVIGATION_MENU_JELLY[preset], wobble)
    frames.push(navigationMenuJellyBox(s))
  }
  return { s, frames }
}

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('navigation menu jelly box', () => {
  it('slides and resizes to the new trigger with a gentle overshoot, then settles exactly', () => {
    const { s, frames } = run()
    const maxW = Math.max(...frames.map((f) => f.width))
    expect(maxW).toBeGreaterThan(B.width + 0.5)
    // Gentle: the overshoot stays a small fraction of the change.
    expect(maxW - B.width).toBeLessThan((B.width - A.width) * 0.25)
    expect(Math.max(...frames.map((f) => f.left))).toBeGreaterThan(B.left)
    expect(navigationMenuJellySettled(s, B)).toBe(true)
    expect(frames.at(-1)!.height).toBeCloseTo(B.height, 1)
  })

  it('wobble off: no overshoot', () => {
    const { frames } = run(false)
    expect(Math.max(...frames.map((f) => f.width))).toBeLessThanOrEqual(B.width + 1e-6)
    expect(Math.max(...frames.map((f) => f.left))).toBeLessThanOrEqual(B.left + 1e-6)
  })

  it('presets: wild wobbles more than subtle', () => {
    const peak = (p: keyof typeof NAVIGATION_MENU_JELLY) => Math.max(...run(true, p).frames.map((f) => f.width)) - B.width
    expect(peak('wild')).toBeGreaterThan(peak('playful'))
    expect(peak('playful')).toBeGreaterThan(peak('subtle'))
  })

  it('effects and feel', () => {
    expect([...NAVIGATION_MENU_EFFECTS]).toEqual(['highlight', 'contentHighlight', 'bloom', 'jelly', 'wobble', 'momentum'])
    expect(NAVIGATION_MENU_FEEL).toBe(TABS_FEEL)
  })
})

/** A list wrapper with two triggers and a link, plus a panel (its own scope) holding a link. */
const setup = () => {
  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <ul>
      <li><button ${NAVIGATION_MENU_ITEM_ATTR} data-navigation-menu-trigger data-state="closed">One</button></li>
      <li><button ${NAVIGATION_MENU_ITEM_ATTR} data-navigation-menu-trigger data-state="closed">Two</button></li>
      <li><a ${NAVIGATION_MENU_ITEM_ATTR} href="#">Docs</a>
        <div ${NAVIGATION_MENU_SCOPE_ATTR}><a ${NAVIGATION_MENU_ITEM_ATTR} href="#" class="inner">Inner</a></div>
      </li>
    </ul>`
  document.body.append(wrap)
  return wrap
}
const over = (el: Element) => el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))

describe('attachNavigationMenuHighlight', () => {
  it('one aria-hidden blob follows the hovered item, then falls back to the open trigger', async () => {
    const wrap = setup()
    const h = attachNavigationMenuHighlight(wrap)
    const el = wrap.firstElementChild as HTMLElement
    expect(el.getAttribute(GOOP_PART_ATTR)).toBe('highlight')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    expect(wrap.hasAttribute(NAVIGATION_MENU_SCOPE_ATTR)).toBe(true)
    const [one, two] = wrap.querySelectorAll('button')
    const docs = wrap.querySelector('a')!
    expect(h.target).toBeNull()
    over(two!)
    expect(two!.hasAttribute('data-highlighted')).toBe(true)
    await new Promise((r) => setTimeout(r, 0))
    expect(findNavigationMenuHighlight(wrap)).toBe(two)
    over(docs)
    expect(findNavigationMenuHighlight(wrap)).toBe(docs)
    expect(two!.hasAttribute('data-highlighted')).toBe(false)
    // Pointer leaves the bar while One's panel is open: the blob rests on One.
    one!.setAttribute('data-state', 'open')
    wrap.dispatchEvent(new PointerEvent('pointerleave'))
    expect(findNavigationMenuHighlight(wrap)).toBe(one)
    h.destroy()
    expect(wrap.querySelector(`[${GOOP_PART_ATTR}="highlight"]`)).toBeNull()
    expect(wrap.hasAttribute(NAVIGATION_MENU_SCOPE_ATTR)).toBe(false)
    expect(activeTickerCount()).toBe(0)
  })

  it('skips the links of a nested panel scope and ignores touch hover', () => {
    const wrap = setup()
    const h = attachNavigationMenuHighlight(wrap)
    const inner = wrap.querySelector('.inner')!
    over(inner)
    expect(inner.hasAttribute('data-highlighted')).toBe(false)
    expect(findNavigationMenuHighlight(wrap)).toBeNull()
    const [one] = wrap.querySelectorAll('button')
    one!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))
    expect(one!.hasAttribute('data-highlighted')).toBe(false)
    h.destroy()
  })

  it('reduced motion: snaps, nothing ticks', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const wrap = setup()
    const h = attachNavigationMenuHighlight(wrap)
    over(wrap.querySelector('button')!)
    expect(h.reducedMotion).toBe(true)
    expect(activeTickerCount()).toBe(0)
    h.destroy()
  })
})

describe('attachNavigationMenuViewport', () => {
  const host = () => {
    const el = document.createElement('div')
    document.body.append(el)
    return el
  }

  it('publishes the target box and snaps to it when opening from closed', () => {
    const el = host()
    let target: NavigationMenuBox | null = { left: 12, width: 300, height: 180 }
    const h = attachNavigationMenuViewport(el, { target: () => target })
    expect(el.style.getPropertyValue(NAVIGATION_MENU_VIEWPORT_VARS.width)).toBe('300px')
    expect(el.style.getPropertyValue(NAVIGATION_MENU_VIEWPORT_VARS.left)).toBe('12px')
    expect(el.querySelector('[data-goop="surface"]')!.getAttribute('aria-hidden')).toBe('true')
    target = { left: 80, width: 360, height: 120 }
    h.open()
    expect(h.box).toEqual({ left: 80, width: 360, height: 120 })
    expect(el.style.getPropertyValue(NAVIGATION_MENU_VIEWPORT_VARS.height)).toBe('120px')
    h.destroy()
    expect(el.style.getPropertyValue(NAVIGATION_MENU_VIEWPORT_VARS.width)).toBe('')
    expect(el.querySelector('[data-goop="surface"]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: the box jumps to a new target, nothing ticks', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = host()
    let target: NavigationMenuBox = { left: 0, width: 200, height: 100 }
    const h = attachNavigationMenuViewport(el, { target: () => target })
    h.open()
    expect(h.state).toBe('open')
    target = { left: 50, width: 260, height: 140 }
    h.refresh()
    expect(h.box).toEqual(target)
    expect(activeTickerCount()).toBe(0)
    expect(h.close()).toBe(0)
    h.destroy()
  })
})

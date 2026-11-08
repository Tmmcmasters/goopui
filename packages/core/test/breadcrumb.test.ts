import { afterEach, describe, expect, it } from 'vitest'
import {
  BREADCRUMB_EFFECTS,
  BREADCRUMB_FEEL,
  BREADCRUMB_LIT_ATTR,
  GOOP_PART_ATTR,
  MENU_FEEL,
  TABS_FEEL,
  activeTickerCount,
  attachBreadcrumbHighlight,
  findBreadcrumbHighlight,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const setup = () => {
  const ol = document.createElement('ol')
  ol.innerHTML =
    '<li><a data-slot="breadcrumb-link" href="#">Home</a></li><li data-slot="breadcrumb-separator">/</li>' +
    '<li><a data-slot="breadcrumb-link" href="#">Docs</a></li><li data-slot="breadcrumb-separator">/</li>' +
    '<li><span data-slot="breadcrumb-page">Breadcrumb</span></li>'
  document.body.append(ol)
  return ol
}
const over = (el: Element) => el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))

describe('breadcrumb feel', () => {
  it('is calmer than the tabs indicator and keeps the menu pointer swell', () => {
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      expect(BREADCRUMB_FEEL[p].stretch).toBeLessThan(TABS_FEEL[p].stretch)
      expect(BREADCRUMB_FEEL[p].lag).toBeLessThan(TABS_FEEL[p].lag)
      expect(BREADCRUMB_FEEL[p].head.dampingRatio).toBeGreaterThan(TABS_FEEL[p].head.dampingRatio)
      expect(BREADCRUMB_FEEL[p].swell).toBe(MENU_FEEL[p].swell)
    }
    expect([...BREADCRUMB_EFFECTS]).toEqual(['highlight', 'wobble', 'momentum', 'followPointer'])
  })
})

describe('attachBreadcrumbHighlight', () => {
  it('lights the hovered link (never the page or a separator) and clears on leave', () => {
    const ol = setup()
    const h = attachBreadcrumbHighlight(ol)
    const el = ol.firstElementChild as HTMLElement
    expect(el.getAttribute(GOOP_PART_ATTR)).toBe('highlight')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    const [home, docs] = ol.querySelectorAll('[data-slot="breadcrumb-link"]')
    expect(findBreadcrumbHighlight(ol)).toBeNull()
    over(home!)
    expect(home!.hasAttribute(BREADCRUMB_LIT_ATTR)).toBe(true)
    expect(findBreadcrumbHighlight(ol)).toBe(home)
    // The gap / separator keeps the last link (no flicker between neighbours).
    over(ol.querySelector('[data-slot="breadcrumb-separator"]')!)
    expect(findBreadcrumbHighlight(ol)).toBe(home)
    over(docs!)
    expect(findBreadcrumbHighlight(ol)).toBe(docs)
    expect(home!.hasAttribute(BREADCRUMB_LIT_ATTR)).toBe(false)
    over(ol.querySelector('[data-slot="breadcrumb-page"]')!)
    expect(findBreadcrumbHighlight(ol)).toBe(docs)
    ol.dispatchEvent(new PointerEvent('pointerleave'))
    expect(findBreadcrumbHighlight(ol)).toBeNull()
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(ol.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
  })

  it('ignores touch; reduced motion snaps', () => {
    const ol = setup()
    const h = attachBreadcrumbHighlight(ol, { reducedMotion: true })
    const home = ol.querySelector('[data-slot="breadcrumb-link"]')!
    home.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))
    expect(h.target).toBeNull()
    over(home)
    expect(h.reducedMotion).toBe(true)
    expect(activeTickerCount()).toBe(0)
    expect(h.target).toBe(home)
    h.destroy()
  })
})

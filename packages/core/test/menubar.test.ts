// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import {
  MENUBAR_EFFECTS,
  MENUBAR_FEEL,
  MENUBAR_LIT_ATTR,
  TABS_FEEL,
  activeTickerCount,
  attachMenubarHighlight,
  findMenubarHighlight,
  menuHighlightInit,
  menuHighlightPose,
  menuHighlightSnap,
  menuHighlightStep,
  type EmergeRect,
} from '../src'

/** A shadcn-like menubar: three triggers (the last disabled). */
const build = () => {
  document.body.innerHTML = `
    <div role="menubar" id="bar">
      <button role="menuitem" aria-haspopup="menu" data-state="closed" id="a">File</button>
      <button role="menuitem" aria-haspopup="menu" data-state="closed" id="b">Edit</button>
      <button role="menuitem" aria-haspopup="menu" data-state="closed" id="c" disabled data-disabled="">View</button>
    </div>`
  return document.getElementById('bar')!
}
const $ = (id: string) => document.getElementById(id)!
const over = (el: Element, pointerType = 'mouse') => el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType }))

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('menubar trigger highlight', () => {
  it('uses the tabs feel and the shared toggles', () => {
    expect(MENUBAR_FEEL).toBe(TABS_FEEL)
    expect([...MENUBAR_EFFECTS]).toEqual(['highlight', 'wobble', 'momentum'])
  })

  it('one aria-hidden body; lights the open trigger first, then the hovered one', () => {
    const bar = build()
    const h = attachMenubarHighlight(bar)
    expect(bar.querySelectorAll('[data-goop="highlight"]')).toHaveLength(1)
    expect(h.element.getAttribute('aria-hidden')).toBe('true')
    expect(h.pop()).toBe(0)
    over($('a'))
    expect($('a').hasAttribute(MENUBAR_LIT_ATTR)).toBe(true)
    expect(findMenubarHighlight(bar)).toBe($('a'))
    over($('b'))
    expect($('a').hasAttribute(MENUBAR_LIT_ATTR)).toBe(false)
    expect(findMenubarHighlight(bar)).toBe($('b'))
    // Disabled triggers and the bar's gaps keep the last one lit.
    over($('c'))
    over(bar)
    expect(findMenubarHighlight(bar)).toBe($('b'))
    // An open menu wins over hover.
    $('a').setAttribute('data-state', 'open')
    expect(findMenubarHighlight(bar)).toBe($('a'))
    // Touch doesn't light by hover; leaving the bar clears the hover.
    $('a').setAttribute('data-state', 'closed')
    bar.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    over($('a'), 'touch')
    expect(findMenubarHighlight(bar)).toBeNull()
    h.destroy()
    expect(bar.querySelector('[data-goop]')).toBeNull()
    expect(bar.querySelector(`[${MENUBAR_LIT_ATTR}]`)).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('skips triggers of a nested highlight', () => {
    const bar = build()
    const h = attachMenubarHighlight(bar)
    const inner = document.createElement('div')
    inner.setAttribute('data-goop-menu', '')
    inner.innerHTML = '<button role="menuitem" aria-haspopup="menu" data-state="open">X</button>'
    bar.append(inner)
    expect(findMenubarHighlight(bar)).toBeNull()
    h.destroy()
  })

  it('reduced motion: snaps, nothing ticks', () => {
    const bar = build()
    const h = attachMenubarHighlight(bar, { reducedMotion: true })
    expect(h.reducedMotion).toBe(true)
    over($('a'))
    over($('b'))
    expect(activeTickerCount()).toBe(0)
    expect(h.target).toBe($('b'))
    h.destroy()
  })

  it('travelling across the bar: one body, low wide lumps, no knob past the trigger height', () => {
    const trig = (i: number): EmergeRect => ({ x: 3 + i * 46, y: 3, width: 44, height: 24 })
    const s = menuHighlightInit()
    menuHighlightSnap(s, trig(0))
    let tallest = 0
    for (let t = 0; t < 1.5; t += 1 / 60) {
      menuHighlightStep(s, trig(2), 1 / 60, MENUBAR_FEEL.playful)
      const { body, circles } = menuHighlightPose(s, MENUBAR_FEEL.playful)
      tallest = Math.max(tallest, body.h, ...circles.map((c) => c.r * 2))
    }
    // Neck lumps stay within the trigger's height band (never a knob above or below the bar).
    expect(tallest).toBeLessThanOrEqual(24 * 1.15)
    expect(s.x.x).toBeCloseTo(trig(2).x + 22, 0)
  })
})

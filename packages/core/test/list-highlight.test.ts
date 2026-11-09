// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { MENU_CONTAINER_ATTR, attachListHighlight, findListHighlight } from '../src'

const over = (el: Element, pointerType = 'mouse') =>
  el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType }))
const flush = () => new Promise((r) => setTimeout(r, 0))

function list(html: string): HTMLElement {
  const nav = document.createElement('nav')
  nav.innerHTML = html
  document.body.append(nav)
  return nav
}

describe('attachListHighlight', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('rests on the active item, follows hover, and returns on leave', () => {
    const nav = list(`<a href="/a" id="a">A</a><a href="/b" id="b" aria-current="page">B</a><a href="/c" id="c">C</a>`)
    const h = attachListHighlight(nav, { active: '[aria-current="page"]', reducedMotion: true })
    expect(nav.hasAttribute(MENU_CONTAINER_ATTR)).toBe(true)
    expect(nav.querySelector('[data-goop="highlight"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(h.target?.id).toBe('b')

    over(nav.querySelector('#c')!)
    expect(nav.querySelector('#c')!.hasAttribute('data-highlighted')).toBe(true)
    expect(h.target?.id).toBe('c')

    nav.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    expect(nav.querySelector('[data-highlighted]')).toBeNull()
    expect(h.target?.id).toBe('b')
    h.destroy()
    expect(nav.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(nav.hasAttribute(MENU_CONTAINER_ATTR)).toBe(false)
  })

  it('ignores touch (no sticky hover), disabled items and hover: false', () => {
    const nav = list(`<button id="a">A</button><button id="b" disabled>B</button><button id="c" data-on>C</button>`)
    const h = attachListHighlight(nav, { active: '[data-on]', reducedMotion: true })
    over(nav.querySelector('#a')!, 'touch')
    expect(h.target?.id).toBe('c')
    over(nav.querySelector('#b')!)
    expect(nav.querySelector('#b')!.hasAttribute('data-highlighted')).toBe(false)
    h.update({ hover: false, focus: false })
    over(nav.querySelector('#a')!)
    expect(h.target?.id).toBe('c')
    const a = nav.querySelector<HTMLElement>('#a')!
    a.focus()
    a.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(a.hasAttribute('data-highlighted')).toBe(false)
    h.destroy()
  })

  it('moves when the active item changes or the lit item is removed', async () => {
    const nav = list(`<a href="#x" id="x" aria-current="location">X</a><a href="#y" id="y">Y</a><a href="#z" id="z">Z</a>`)
    const h = attachListHighlight(nav, { active: '[aria-current]', reducedMotion: true })
    expect(h.target?.id).toBe('x')
    nav.querySelector('#x')!.removeAttribute('aria-current')
    nav.querySelector('#y')!.setAttribute('aria-current', 'location')
    await flush()
    expect(h.target?.id).toBe('y')

    over(nav.querySelector('#z')!)
    expect(h.target?.id).toBe('z')
    nav.querySelector('#z')!.remove()
    await flush()
    expect(h.target?.id).toBe('y')
    h.destroy()
  })

  it('only rides matching items of its own list', () => {
    const nav = list(`<a href="/a" id="a" aria-current="page">A</a><span id="s" aria-current="page">S</span>`)
    nav.setAttribute(MENU_CONTAINER_ATTR, '')
    expect(findListHighlight(nav, 'a[href]', '[aria-current]')?.id).toBe('a')
    expect(findListHighlight(nav, 'span', () => null)).toBeNull()
  })
})

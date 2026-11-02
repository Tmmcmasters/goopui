import { afterEach, describe, expect, it } from 'vitest'
import {
  COMBOBOX_EFFECTS,
  COMMAND_EFFECTS,
  MENU_CONTAINER_ATTR,
  attachMenuHighlight,
  findCommandHighlight,
  isRenderedItem,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const list = (html: string): HTMLElement => {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.append(el)
  return el
}

describe('command effects', () => {
  it('lists the toggleable command and combobox effects', () => {
    expect([...COMMAND_EFFECTS]).toEqual(['highlight', 'pop', 'ring'])
    expect([...COMBOBOX_EFFECTS]).toEqual(['highlight', 'pop', 'plop'])
  })
})

describe('findCommandHighlight', () => {
  it('finds the highlighted option', () => {
    const c = list('<div role="option" id="a"></div><div role="option" id="b" data-highlighted></div>')
    expect(findCommandHighlight(c)?.id).toBe('b')
  })

  it('returns null when nothing is highlighted', () => {
    const c = list('<div role="option" id="a"></div>')
    expect(findCommandHighlight(c)).toBeNull()
  })

  it('skips a highlighted item a filter hid (display: none, or in a hidden group)', () => {
    const c = list(
      '<div role="option" id="a" data-highlighted style="display:none"></div>' +
        '<div hidden><div role="option" id="b" data-highlighted></div></div>',
    )
    expect(findCommandHighlight(c)).toBeNull()
    expect(isRenderedItem(c.querySelector('#a')!)).toBe(false)
    expect(isRenderedItem(c.querySelector('#b')!)).toBe(false)
  })

  it('skips detached items and items of a nested highlight container', () => {
    const c = list(`<div ${MENU_CONTAINER_ATTR}><div role="option" id="n" data-highlighted></div></div>`)
    c.setAttribute(MENU_CONTAINER_ATTR, '')
    expect(findCommandHighlight(c)).toBeNull()
    const loose = document.createElement('div')
    expect(isRenderedItem(loose)).toBe(false)
  })

  it('drives the menu highlight: the blob follows keyboard / pointer highlight moves', async () => {
    const c = list('<div role="option" id="a" data-highlighted></div><div role="option" id="b"></div>')
    const h = attachMenuHighlight(c, { find: findCommandHighlight })
    expect(h.target?.id).toBe('a')
    c.querySelector('#a')!.removeAttribute('data-highlighted')
    c.querySelector('#b')!.setAttribute('data-highlighted', '')
    await new Promise((r) => setTimeout(r, 0))
    expect(h.target?.id).toBe('b')
    // Filtered out: the blob lets go of it.
    ;(c.querySelector('#b') as HTMLElement).style.display = 'none'
    h.refresh()
    await new Promise((r) => setTimeout(r, 50))
    expect(h.target).toBeNull()
    h.destroy()
  })
})

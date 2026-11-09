// Table row highlight, Item group highlight + press, Input Group ring.
import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  INPUT_GROUP_CONTROL,
  ITEM_FEEL,
  ITEM_GROUP_EFFECTS,
  ITEM_PRESS_FEEL,
  MENU_CONTAINER_ATTR,
  MENU_FEEL,
  TABLE_EFFECTS,
  TABLE_FEEL,
  TABLE_INSET,
  TABLE_REST_ATTR,
  activeTickerCount,
  attachInputGroup,
  attachItemGroupHighlight,
  attachItemPress,
  attachTableHighlight,
  findTableSelected,
  itemPressScale,
  tableRowRect,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const over = (el: Element, pointerType = 'mouse') => el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType }))
const tick = () => new Promise((r) => setTimeout(r, 0))

// ---- Table -------------------------------------------------------------------------------------

const table = () => {
  const c = document.createElement('div')
  c.setAttribute('data-slot', 'table-container')
  c.innerHTML =
    '<table data-slot="table"><thead data-slot="table-header"><tr data-slot="table-row"><th>Name</th></tr></thead>' +
    '<tbody data-slot="table-body">' +
    '<tr data-slot="table-row"><td>A</td></tr>' +
    '<tr data-slot="table-row" data-state="selected"><td>B</td></tr>' +
    '<tr data-slot="table-row"><td>C</td></tr>' +
    '</tbody><tfoot data-slot="table-footer"><tr data-slot="table-row"><td>Total</td></tr></tfoot></table>'
  document.body.append(c)
  const rows = c.querySelectorAll<HTMLElement>('[data-slot="table-body"] > tr')
  return { c, rows, head: c.querySelector('thead tr')!, foot: c.querySelector('tfoot tr')! }
}

describe('table feel', () => {
  it('is calmer than the menu highlight and keeps its pointer swell', () => {
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      expect(TABLE_FEEL[p].stretch).toBeLessThan(MENU_FEEL[p].stretch)
      expect(TABLE_FEEL[p].lag).toBeLessThan(MENU_FEEL[p].lag)
      expect(TABLE_FEEL[p].head.dampingRatio).toBeGreaterThan(MENU_FEEL[p].head.dampingRatio)
      expect(TABLE_FEEL[p].swell).toBe(MENU_FEEL[p].swell)
    }
    expect([...TABLE_EFFECTS]).toEqual(['highlight', 'wobble', 'momentum', 'followPointer', 'selected'])
  })

  it('insets the row into a pill, never inverted', () => {
    expect(tableRowRect({ x: 0, y: 10, width: 300, height: 37 })).toEqual({
      x: TABLE_INSET.x,
      y: 10 + TABLE_INSET.y,
      width: 300 - TABLE_INSET.x * 2,
      height: 37 - TABLE_INSET.y * 2,
    })
    const tiny = tableRowRect({ x: 0, y: 0, width: 4, height: 2 })
    expect(tiny.width).toBeGreaterThan(0)
    expect(tiny.height).toBeGreaterThan(0)
  })
})

describe('attachTableHighlight', () => {
  it('puts the blob in a clipping aria-hidden stage, lights body rows only, clears on leave', () => {
    const { c, rows, head, foot } = table()
    const h = attachTableHighlight(c)
    const stage = c.firstElementChild as HTMLElement
    expect(stage.getAttribute(GOOP_PART_ATTR)).toBe('table-stage')
    expect(stage.getAttribute('aria-hidden')).toBe('true')
    expect(stage.style.overflow).toBe('clip')
    expect(stage.firstElementChild!.getAttribute(GOOP_PART_ATTR)).toBe('highlight')
    expect(c.hasAttribute(MENU_CONTAINER_ATTR)).toBe(true)
    // Nothing goes in the table itself.
    expect(c.querySelector('table')!.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
    over(rows[0]!.firstElementChild!)
    expect(rows[0]!.hasAttribute('data-highlighted')).toBe(true)
    over(head)
    over(foot)
    expect(rows[0]!.hasAttribute('data-highlighted')).toBe(true)
    expect(head.hasAttribute('data-highlighted')).toBe(false)
    expect(foot.hasAttribute('data-highlighted')).toBe(false)
    over(rows[2]!)
    expect(rows[2]!.hasAttribute('data-highlighted')).toBe(true)
    expect(rows[0]!.hasAttribute('data-highlighted')).toBe(false)
    c.dispatchEvent(new PointerEvent('pointerleave'))
    expect(rows[2]!.hasAttribute('data-highlighted')).toBe(false)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(c.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
    expect(c.hasAttribute(MENU_CONTAINER_ATTR)).toBe(false)
  })

  it('ignores touch (no sticky hover)', () => {
    const { c, rows } = table()
    const h = attachTableHighlight(c, { reducedMotion: true })
    over(rows[0]!, 'touch')
    expect(h.target).toBeNull()
    h.destroy()
  })

  it('selected: rests on the selected row and marks it while the blob is there', async () => {
    const { c, rows } = table()
    expect(findTableSelected(c)).toBe(rows[1])
    const h = attachTableHighlight(c, { selected: true, reducedMotion: true })
    expect(rows[1]!.hasAttribute(TABLE_REST_ATTR)).toBe(true)
    over(rows[0]!)
    await tick()
    expect(rows[1]!.hasAttribute(TABLE_REST_ATTR)).toBe(false)
    c.dispatchEvent(new PointerEvent('pointerleave'))
    await tick()
    expect(rows[1]!.hasAttribute(TABLE_REST_ATTR)).toBe(true)
    h.refresh()
    expect(h.target).toBe(rows[1])
    h.update({ selected: false })
    expect(rows[1]!.hasAttribute(TABLE_REST_ATTR)).toBe(false)
    h.destroy()
  })

  it('without selected it never rests', () => {
    const { c, rows } = table()
    const h = attachTableHighlight(c, { reducedMotion: true })
    h.refresh()
    expect(h.target).toBeNull()
    expect(rows[1]!.hasAttribute(TABLE_REST_ATTR)).toBe(false)
    h.destroy()
  })
})

// ---- Item --------------------------------------------------------------------------------------

const group = () => {
  const g = document.createElement('div')
  g.setAttribute('role', 'list')
  g.setAttribute('data-slot', 'item-group')
  g.innerHTML =
    '<a data-slot="item" href="#a">A</a>' +
    '<div data-slot="item">Plain <button>Act</button></div>' +
    '<button data-slot="item">B</button>' +
    '<a data-slot="item" href="#c" aria-disabled="true">C</a>'
  document.body.append(g)
  const [a, plain, b, off] = Array.from(g.querySelectorAll<HTMLElement>('[data-slot="item"]'))
  return { g, a: a!, plain: plain!, b: b!, off: off! }
}

describe('item feel', () => {
  it('group blob is a calm menu highlight; press is small and only ever shrinks', () => {
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      expect(ITEM_FEEL[p].stretch).toBeLessThan(MENU_FEEL[p].stretch)
      expect(ITEM_FEEL[p].head.dampingRatio).toBeGreaterThan(MENU_FEEL[p].head.dampingRatio)
      expect(ITEM_PRESS_FEEL[p].squishY).toBeLessThan(0.1)
    }
    expect(ITEM_PRESS_FEEL.subtle.squishY).toBeLessThan(ITEM_PRESS_FEEL.playful.squishY)
    expect(ITEM_PRESS_FEEL.playful.squishY).toBeLessThan(ITEM_PRESS_FEEL.wild.squishY)
    expect([...ITEM_GROUP_EFFECTS]).toEqual(['highlight', 'wobble', 'momentum', 'followPointer'])
    for (const p of [-1.4, -0.5, 0, 0.3, 1, 1.5]) {
      const s = itemPressScale(p)
      expect(s.sx).toBeLessThanOrEqual(1)
      expect(s.sy).toBeLessThanOrEqual(1)
    }
    expect(itemPressScale(1, ITEM_PRESS_FEEL.playful, 0)).toEqual({ sx: 1, sy: 1 })
  })
})

describe('attachItemGroupHighlight', () => {
  it('lights interactive items only (not a plain item, not a disabled one)', () => {
    const { g, a, plain, b, off } = group()
    const h = attachItemGroupHighlight(g, { reducedMotion: true })
    expect(g.firstElementChild!.getAttribute(GOOP_PART_ATTR)).toBe('highlight')
    over(a)
    expect(h.target).toBe(a)
    over(plain.querySelector('button')!)
    expect(h.target).toBe(a)
    over(b)
    expect(h.target).toBe(b)
    over(off)
    expect(h.target).toBe(b)
    g.dispatchEvent(new PointerEvent('pointerleave'))
    expect(h.target).toBeNull()
    over(a, 'touch')
    expect(h.target).toBeNull()
    expect(h.pop()).toBe(0)
    h.destroy()
    expect(g.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
  })
})

describe('attachItemPress', () => {
  it('squishes an interactive item while pressed and lets go to rest', async () => {
    const { a } = group()
    const h = attachItemPress(a)
    a.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }))
    expect(activeTickerCount()).toBeGreaterThan(0)
    await new Promise((r) => setTimeout(r, 120))
    expect(h.scale.sy).toBeLessThan(1)
    expect(a.style.scale).not.toBe('')
    a.dispatchEvent(new PointerEvent('pointerup'))
    await new Promise((r) => setTimeout(r, 1500))
    expect(h.scale).toEqual({ sx: 1, sy: 1 })
    expect(a.style.scale).toBe('')
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  }, 10_000)

  it('never presses a plain item, a disabled one, with press off, or under reduced motion', () => {
    const { plain, off, a } = group()
    for (const [el, o] of [
      [plain, {}],
      [off, {}],
      [a, { press: false }],
      [a, { reducedMotion: true }],
    ] as const) {
      const h = attachItemPress(el, o)
      h.press()
      expect(activeTickerCount()).toBe(0)
      h.destroy()
    }
  })
})

// ---- Input Group -------------------------------------------------------------------------------

const inputGroup = () => {
  const host = document.createElement('div')
  host.innerHTML =
    '<div data-slot="input-group" role="group">' +
    '<input data-slot="input-group-control" value="hi" />' +
    '<div data-slot="input-group-addon" data-align="inline-end"><button type="button">Go</button></div>' +
    '</div>'
  document.body.append(host)
  const group = host.firstElementChild as HTMLElement
  return { host, group, input: group.querySelector<HTMLInputElement>(INPUT_GROUP_CONTROL)!, button: group.querySelector('button')! }
}

describe('attachInputGroup', () => {
  it('rings the whole group: focus in a control shows it, leaving the controls drains it', () => {
    const { host, group, input, button } = inputGroup()
    const h = attachInputGroup(host, group)
    expect(host.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)).toHaveLength(1)
    expect(h.state.shown).toBe(false)
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(h.state.shown).toBe(true)
    // Focus moving to a button in the group is leaving the controls (shadcn's ring goes too).
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: button }))
    expect(h.state.shown).toBe(false)
    h.destroy()
    expect(host.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)).toHaveLength(0)
    expect(activeTickerCount()).toBe(0)
  })

  it('ignores focus on non-controls and typing ripples from the control', () => {
    const { host, group, input, button } = inputGroup()
    const h = attachInputGroup(host, group)
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(h.state.shown).toBe(false)
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(h.state.ripples.length).toBeGreaterThan(0)
    h.destroy()
  })

  it('goes invalid when any part inside carries aria-invalid', async () => {
    const { host, group, input } = inputGroup()
    const h = attachInputGroup(host, group)
    input.setAttribute('aria-invalid', 'true')
    await tick()
    expect(h.state.invalid).toBe(true)
    expect(h.state.shown).toBe(true)
    input.setAttribute('aria-invalid', 'false')
    await tick()
    expect(h.state.invalid).toBe(false)
    h.destroy()
  })

  it('reduced motion: a static closed ring', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { host, group, input } = inputGroup()
    const h = attachInputGroup(host, group)
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(h.running).toBe(false)
    expect(h.state.cover).toBe(1)
    h.destroy()
  })
})

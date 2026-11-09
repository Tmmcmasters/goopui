import { afterEach, describe, expect, it } from 'vitest'
import {
  CALENDAR_ATTR,
  CALENDAR_BANDED_ATTR,
  CALENDAR_BAND_ATTR,
  CALENDAR_EFFECTS,
  CALENDAR_FEEL,
  CALENDAR_FILLED_ATTR,
  CALENDAR_FOCUS_ATTR,
  CALENDAR_SLOSH_ATTR,
  TOGGLE_FLIGHT_CIRCLES,
  activeTickerCount,
  attachCalendar,
  calendarPageDirection,
  calendarSloshEnd,
  calendarSloshOffset,
} from '../src'

const F = CALENDAR_FEEL.playful
const CELL = 32
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const rect = (x: number, y: number, w: number, h: number): DOMRect =>
  ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON() {} }) as DOMRect

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

/** A reka-like month: root > table > tbody > tr x weeks > td > button (laid out by hand,
 *  happy-dom has no layout). Days are `${month}-DD`, DD = 01.. (no outside-view days). */
function month(root: HTMLElement, key = '2026-11', weeks = 5, attr = 'data-reka-calendar-cell-trigger'): HTMLButtonElement[] {
  root.querySelector('table')?.remove()
  const table = document.createElement('table')
  const body = document.createElement('tbody')
  const out: HTMLButtonElement[] = []
  for (let r = 0; r < weeks; r++) {
    const tr = document.createElement('tr')
    for (let c = 0; c < 7; c++) {
      const td = document.createElement('td')
      const b = document.createElement('button')
      b.setAttribute(attr, '')
      const d = r * 7 + c + 1
      b.setAttribute('data-value', `${key}-${String(d).padStart(2, '0')}`)
      b.getBoundingClientRect = () => rect(c * CELL, r * CELL, CELL, CELL)
      td.append(b)
      tr.append(td)
      out.push(b)
    }
    body.append(tr)
  }
  table.append(body)
  root.append(table)
  return out
}

function calendar(): { root: HTMLElement; days: HTMLButtonElement[] } {
  const root = document.createElement('div')
  root.getBoundingClientRect = () => rect(0, 0, 7 * CELL, 5 * CELL)
  document.body.append(root)
  return { root, days: month(root) }
}

const part = (root: Element, name: string) => root.querySelector(`[data-goop-part="${name}"]`)

describe('calendar slosh (pure)', () => {
  it('lists its effects', () => {
    expect([...CALENDAR_EFFECTS]).toEqual(['flow', 'pulse', 'band', 'slosh', 'focus'])
  })

  it('is still at the page, swings the way the month moved, then settles', () => {
    expect(calendarSloshOffset(0, 6, 0, 7, 1, F)).toBe(0)
    let min = 0
    let max = 0
    for (let t = 0; t < 0.4; t += 0.005) {
      const x = calendarSloshOffset(t, 6, 0, 7, 1, F)
      min = Math.min(min, x)
      max = Math.max(max, x)
    }
    // Forward: the days swing left first, a gentle few px (never a big lurch).
    expect(min).toBeLessThan(-F.slosh * 0.8)
    expect(Math.abs(min)).toBeLessThan(F.slosh * 1.3)
    expect(max).toBeLessThan(Math.abs(min))
    const end = calendarSloshEnd(7, 6, F)
    expect(calendarSloshOffset(end, 0, 5, 7, 1, F)).toBeCloseTo(0, 5)
    // Back pages mirror it.
    expect(calendarSloshOffset(0.08, 0, 0, 7, -1, F)).toBeCloseTo(-calendarSloshOffset(0.08, 6, 0, 7, 1, F))
  })

  it('rolls in from the leading side; strength 0 and dir 0 are off', () => {
    const t = F.stagger * 2
    expect(calendarSloshOffset(t, 6, 0, 7, 1, F)).not.toBe(0)
    expect(calendarSloshOffset(t, 0, 0, 7, 1, F)).toBe(0)
    expect(calendarSloshOffset(0.1, 6, 0, 7, 1, F, 0)).toBe(0)
    expect(calendarSloshOffset(0.1, 6, 0, 7, 0, F)).toBe(0)
  })

  it('presets scale it: subtle < playful < wild', () => {
    expect(CALENDAR_FEEL.subtle.slosh).toBeLessThan(F.slosh)
    expect(F.slosh).toBeLessThan(CALENDAR_FEEL.wild.slosh)
  })

  it('page direction from the month keys', () => {
    expect(calendarPageDirection('2026-11-01', '2026-12-01')).toBe(1)
    expect(calendarPageDirection('2026-11-01', '2026-10-01')).toBe(-1)
    expect(calendarPageDirection('2026-12-01', '2027-01-01')).toBe(1)
    expect(calendarPageDirection('2026-11-01', '2026-11-20')).toBe(0)
    expect(calendarPageDirection(null, '2026-11-01')).toBe(0)
  })
})

describe('attachCalendar', () => {
  it('single: a focus wash and a selection layer, no band; destroy cleans up', () => {
    const { root, days } = calendar()
    days[3]!.setAttribute('data-selected', 'true')
    const h = attachCalendar(root, { reducedMotion: false })
    expect(root.hasAttribute(CALENDAR_ATTR)).toBe(true)
    expect(root.hasAttribute(CALENDAR_FOCUS_ATTR)).toBe(true)
    expect(root.hasAttribute('data-goop-menu')).toBe(false)
    expect(part(root, 'calendar-selection')).not.toBeNull()
    expect(part(root, 'calendar-band')).toBeNull()
    expect(root.querySelector('[data-goop="highlight"]')).not.toBeNull()
    // Already selected at attach: full at once, no animation.
    expect(days[3]!.hasAttribute(CALENDAR_FILLED_ATTR)).toBe(true)
    expect(h.running).toBe(false)
    h.destroy()
    expect(root.hasAttribute(CALENDAR_ATTR)).toBe(false)
    expect(part(root, 'calendar-selection')).toBeNull()
    expect(root.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(days[3]!.hasAttribute(CALENDAR_FILLED_ATTR)).toBe(false)
    expect(activeTickerCount()).toBe(0)
  })

  it('picking a new day flows the goo from the old day to the new one', () => {
    const { root, days } = calendar()
    days[3]!.setAttribute('data-selected', 'true')
    const h = attachCalendar(root, { reducedMotion: false })
    const n = h.selection!.pose!.circles.length
    days[3]!.removeAttribute('data-selected')
    days[17]!.setAttribute('data-selected', 'true')
    h.update({ value: '2026-11-18' })
    expect(h.running).toBe(true)
    expect(h.selection!.pose!.circles.length).toBe(n + TOGGLE_FLIGHT_CIRCLES)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  })

  it('flow off: the old day drains and the new one floods in place', () => {
    const { root, days } = calendar()
    days[3]!.setAttribute('data-selected', 'true')
    const h = attachCalendar(root, { reducedMotion: false, flow: false })
    const n = h.selection!.pose!.circles.length
    days[3]!.removeAttribute('data-selected')
    days[17]!.setAttribute('data-selected', 'true')
    h.update({ value: '2026-11-18' })
    expect(h.running).toBe(true)
    expect(h.selection!.pose!.circles.length).toBe(n)
    h.destroy()
  })

  it('range: the band grows day by day and marks the days it covers', async () => {
    const { root, days } = calendar()
    days[2]!.setAttribute('data-selected', 'true')
    days[2]!.setAttribute('data-selection-start', 'true')
    const h = attachCalendar(root, { range: true, reducedMotion: false })
    expect(root.hasAttribute(CALENDAR_BAND_ATTR)).toBe(true)
    expect(part(root, 'calendar-band')).not.toBeNull()
    // Layer order: wash, band, selection (later paints on top).
    const layers = [...root.children].map((c) => c.getAttribute('data-goop-part') ?? c.getAttribute('data-goop'))
    expect(layers.indexOf('highlight')).toBeLessThan(layers.indexOf('calendar-band'))
    expect(layers.indexOf('calendar-band')).toBeLessThan(layers.indexOf('calendar-selection'))
    for (let i = 3; i <= 6; i++) days[i]!.setAttribute('data-selected', 'true')
    days[6]!.setAttribute('data-selection-end', 'true')
    h.update({ value: ['2026-11-03', '2026-11-07'] })
    expect(h.band!.running).toBe(true)
    // The far end is still dry right after the change (it grows out of the start).
    expect(h.band!.pose!.levels[6]).toBe(0)
    await wait((F.grow * 5 + 0.7) * 1000)
    for (let i = 2; i <= 6; i++) expect(days[i]!.hasAttribute(CALENDAR_BANDED_ATTR), `day ${i}`).toBe(true)
    expect(days[7]!.hasAttribute(CALENDAR_BANDED_ATTR)).toBe(false)
    // The caps are the selection goo; the days between are not.
    expect(days[6]!.hasAttribute(CALENDAR_FILLED_ATTR)).toBe(true)
    expect(days[4]!.hasAttribute(CALENDAR_FILLED_ATTR)).toBe(false)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  })

  it('every effect is a toggle: focus and band off attach no layer', () => {
    const { root } = calendar()
    const h = attachCalendar(root, { range: true, band: false, focus: false, reducedMotion: false })
    expect(part(root, 'calendar-band')).toBeNull()
    expect(root.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(part(root, 'calendar-selection')).not.toBeNull()
    h.update({ band: true, focus: true })
    expect(part(root, 'calendar-band')).not.toBeNull()
    expect(root.querySelector('[data-goop="highlight"]')).not.toBeNull()
    const layers = [...root.children].map((c) => c.getAttribute('data-goop-part'))
    expect(layers.indexOf('calendar-band')).toBeLessThan(layers.indexOf('calendar-selection'))
    h.update({ band: 0, focus: false })
    expect(part(root, 'calendar-band')).toBeNull()
    expect(root.hasAttribute(CALENDAR_BAND_ATTR)).toBe(false)
    expect(root.querySelector('[data-goop="highlight"]')).toBeNull()
    h.destroy()
  })

  it('paging the month sloshes the new days, then hands them back untouched', async () => {
    const { root } = calendar()
    const h = attachCalendar(root, { reducedMotion: false })
    const next = month(root, '2026-12')
    await Promise.resolve()
    expect(h.sloshing).toBe(true)
    expect(next.every((d) => d.hasAttribute(CALENDAR_SLOSH_ATTR))).toBe(true)
    await wait((calendarSloshEnd(7, 5, F) + 0.2) * 1000)
    expect(h.sloshing).toBe(false)
    expect(next.every((d) => !d.hasAttribute(CALENDAR_SLOSH_ATTR) && d.style.translate === '')).toBe(true)
    h.update({ slosh: false })
    month(root, '2027-01')
    await Promise.resolve()
    expect(h.sloshing).toBe(false)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: static fills, no slosh, nothing runs', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { root, days } = calendar()
    days[3]!.setAttribute('data-selected', 'true')
    const h = attachCalendar(root)
    expect(h.reducedMotion).toBe(true)
    days[3]!.removeAttribute('data-selected')
    days[10]!.setAttribute('data-selected', 'true')
    h.update({ value: 'x' })
    expect(h.running).toBe(false)
    expect(h.selection!.pose!.levels[10]).toBe(1)
    month(root, '2026-12')
    await Promise.resolve()
    expect(h.sloshing).toBe(false)
    h.destroy()
  })

  it('a touch pointer never parks the wash on a day (no sticky hover)', () => {
    const { root, days } = calendar()
    const h = attachCalendar(root, { reducedMotion: true })
    days[4]!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))
    expect(h.focus!.target).toBeNull()
    days[4]!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    h.focus!.refresh()
    expect(h.focus!.target).toBe(days[4])
    root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    h.focus!.refresh()
    expect(h.focus!.target).toBeNull()
    h.destroy()
  })

  it('reads any day grid through `days` (e.g. react-day-picker)', () => {
    const root = document.createElement('div')
    root.getBoundingClientRect = () => rect(0, 0, 7 * CELL, 5 * CELL)
    document.body.append(root)
    const days = month(root, '2026-11', 5, 'data-day')
    days[5]!.setAttribute('aria-selected', 'true')
    const h = attachCalendar(root, {
      reducedMotion: false,
      days: {
        cell: '[data-day]',
        isSelected: (el) => el.getAttribute('aria-selected') === 'true',
        month: (r) => r.querySelector('[data-day]')?.getAttribute('data-value') ?? null,
        attrs: ['aria-selected'],
      },
    })
    expect(days[5]!.hasAttribute(CALENDAR_FILLED_ATTR)).toBe(true)
    const n = h.selection!.pose!.circles.length
    days[5]!.removeAttribute('aria-selected')
    days[9]!.setAttribute('aria-selected', 'true')
    h.update({ value: 'b' })
    expect(h.running).toBe(true)
    expect(h.selection!.pose!.circles.length).toBe(n + TOGGLE_FLIGHT_CIRCLES)
    h.destroy()
  })
})

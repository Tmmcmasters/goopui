// Client + hydration tests for Calendar and Range Calendar: shadcn/ui's markup (react-day-picker),
// engine props off the DOM, the same core engine as @goopui/vue (props map to the same core
// options), the range hover preview, and the server markup hydrating with no mismatch before the
// goo attaches.
import { activeTickerCount, type CalendarHandle } from '@goopui/core'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createElement as h, createRef, Fragment, useState, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import type { DateRange } from 'react-day-picker'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CALENDAR_PROP_KEYS, GoopCalendar, GoopRangeCalendar, toCalendarOptions } from '../src'
import { goopComponents } from '../src/manifest'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const NOV = new Date(2026, 10, 9)
const TODAY = new Date(2026, 10, 2)
const day = (root: ParentNode, iso: string) => root.querySelector<HTMLButtonElement>(`td[data-day="${iso}"] > button`)!
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Single(props: Record<string, unknown>) {
  const [date, setDate] = useState<Date | undefined>(NOV)
  return h(GoopCalendar, { mode: 'single', selected: date, onSelect: setDate, defaultMonth: NOV, today: TODAY, ...props } as never)
}

describe('props', () => {
  it('are in the manifest and map to core options', () => {
    for (const n of ['GoopCalendar', 'GoopCalendarDayButton', 'GoopRangeCalendar']) expect(goopComponents).toContain(n)
    for (const k of ['flow', 'pulse', 'band', 'slosh', 'focus', 'textFollow']) expect(CALENDAR_PROP_KEYS).toContain(k)
    expect(toCalendarOptions({ slosh: false, band: 0.5, speed: 2 }, { preset: 'subtle' })).toMatchObject({ slosh: false, band: 0.5, speed: 2, preset: 'subtle' })
    expect(toCalendarOptions({ goo: false })).toBeNull()
  })

  it('match @goopui/vue (same keys, same core options)', async () => {
    const vue = await import('../../vue/src/goop-props')
    expect([...CALENDAR_PROP_KEYS]).toEqual([...vue.CALENDAR_PROP_KEYS])
    for (const cfg of [{}, { preset: 'wild' as const, reducedMotion: true }, { renderer: 'canvas' as const }])
      for (const p of [{}, { goo: false }, { flow: false, pulse: 2 }, { band: 0, slosh: false, focus: 1.5 }, { textFollow: false, speed: 0.5, preset: 'subtle' as const }])
        expect(toCalendarOptions(p, cfg)).toEqual(vue.toCalendarOptions(p, cfg))
  })
})

describe('GoopCalendar', () => {
  it("renders shadcn's markup; ref is the root, goopRef the handle; unmount cleans up", () => {
    const ref = createRef<HTMLDivElement>()
    const goopRef = createRef<CalendarHandle>()
    const { container, unmount } = render(h(Single, { ref, goopRef, className: 'my-cal', slosh: 1.5 }))
    const root = container.querySelector<HTMLElement>('[data-slot="calendar"]')!
    expect(ref.current).toBe(root)
    expect(root.className).toContain('group/calendar')
    expect(root.className).toContain('my-cal')
    expect(root.className).toContain('rdp-root')
    expect(root.hasAttribute('slosh')).toBe(false)
    expect(root.getAttribute('data-goop-host')).toBe('calendar')
    expect(root.hasAttribute('data-goop-calendar')).toBe(true)
    expect(root.hasAttribute('data-goop-focus')).toBe(true)
    expect(goopRef.current?.selection).not.toBeNull()
    expect(root.querySelector('.rdp-caption_label')!.textContent).toContain('2026')
    expect(root.querySelectorAll('td[data-day] > button').length).toBeGreaterThanOrEqual(28)
    expect(root.querySelector('.rdp-button_next svg')).not.toBeNull()
    const nov9 = day(root, '2026-11-09')
    expect(nov9.getAttribute('data-selected-single')).toBe('true')
    expect(nov9.getAttribute('data-slot')).toBe('button')
    expect(root.querySelector('[data-goop-part="calendar-selection"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(root.querySelector('[data-goop-part="calendar-band"]')).toBeNull()
    expect(nov9.hasAttribute('data-goop-filled')).toBe(true)
    unmount()
    expect(document.querySelector('[data-goop-part]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('picking a day flows the goo there, on the same day buttons (no remount)', async () => {
    const goopRef = createRef<CalendarHandle>()
    const { container } = render(h(Single, { goopRef }))
    const root = container.querySelector<HTMLElement>('[data-slot="calendar"]')!
    const before = day(root, '2026-11-20')
    await act(async () => fireEvent.click(before))
    expect(day(root, '2026-11-20')).toBe(before)
    expect(before.parentElement!.getAttribute('data-selected')).toBe('true')
    expect(day(root, '2026-11-09').getAttribute('data-selected-single')).not.toBe('true')
    expect(goopRef.current!.running).toBe(true)
  })

  it('uncontrolled (no onSelect): goopUI keeps the selection', async () => {
    const goopRef = createRef<CalendarHandle>()
    const { container } = render(h(GoopCalendar, { mode: 'single', defaultMonth: NOV, goopRef }))
    const root = container.querySelector<HTMLElement>('[data-slot="calendar"]')!
    await act(async () => fireEvent.click(day(root, '2026-11-12')))
    expect(day(root, '2026-11-12').getAttribute('data-selected-single')).toBe('true')
    expect(day(root, '2026-11-12').hasAttribute('data-goop-filled')).toBe(true)
  })

  it('paging the month sloshes the days; slosh={false} does not', async () => {
    const goopRef = createRef<CalendarHandle>()
    const { container, rerender } = render(h(Single, { goopRef }))
    const root = container.querySelector<HTMLElement>('[data-slot="calendar"]')!
    await act(async () => fireEvent.click(root.querySelector('.rdp-button_next')!))
    await act(async () => {})
    expect(root.querySelector('.rdp-caption_label')!.textContent).toContain('December')
    expect(goopRef.current!.sloshing).toBe(true)
    rerender(h(Single, { goopRef, slosh: false }))
    await act(async () => fireEvent.click(root.querySelector('.rdp-button_next')!))
    await act(async () => {})
    expect(goopRef.current!.sloshing).toBe(false)
  })

  it('a touch pointer never parks the wash on a day (no sticky hover)', async () => {
    const goopRef = createRef<CalendarHandle>()
    const { container } = render(h(Single, { goopRef }))
    const b = day(container, '2026-11-14')
    b.getBoundingClientRect = () => ({ left: 0, top: 0, right: 28, bottom: 28, width: 28, height: 28, x: 0, y: 0, toJSON() {} }) as DOMRect
    fireEvent.pointerOver(b, { pointerType: 'touch' })
    goopRef.current!.focus!.refresh()
    await wait(60)
    expect(goopRef.current!.focus!.target).toBeNull()
    fireEvent.pointerOver(b, { pointerType: 'mouse' })
    goopRef.current!.focus!.refresh()
    await wait(60)
    expect(goopRef.current!.focus!.target).toBe(b)
  })

  it('goo={false} is a plain shadcn Calendar', () => {
    const { container } = render(h(Single, { goo: false }))
    const root = container.querySelector<HTMLElement>('[data-slot="calendar"]')!
    expect(root.hasAttribute('data-goop-calendar')).toBe(false)
    expect(root.hasAttribute('data-goop-host')).toBe(false)
    expect(root.querySelector('[data-goop-part]')).toBeNull()
    expect(day(root, '2026-11-09').className).toContain('data-[selected-single=true]:bg-primary')
  })
})

describe('GoopRangeCalendar', () => {
  function Range(props: Record<string, unknown>) {
    const [range, setRange] = useState<DateRange | undefined>(props.initial as DateRange | undefined)
    return h(GoopRangeCalendar, { selected: range, onSelect: setRange, defaultMonth: NOV, today: TODAY, ...props, initial: undefined } as never)
  }

  it('fills the range as a band with primary caps; band={false} drops the band', async () => {
    const goopRef = createRef<CalendarHandle>()
    const initial = { from: new Date(2026, 10, 9), to: new Date(2026, 10, 13) }
    const { container, rerender } = render(h(Range, { initial, goopRef }))
    const root = container.querySelector<HTMLElement>('[data-slot="calendar"]')!
    expect(root.getAttribute('data-goop-host')).toBe('range-calendar')
    expect(root.hasAttribute('data-goop-band')).toBe(true)
    expect(root.querySelector('[data-goop-part="calendar-band"]')).not.toBeNull()
    expect(day(root, '2026-11-09').getAttribute('data-range-start')).toBe('true')
    expect(day(root, '2026-11-11').hasAttribute('data-goop-banded')).toBe(true)
    expect(day(root, '2026-11-11').hasAttribute('data-goop-filled')).toBe(false)
    expect(day(root, '2026-11-13').hasAttribute('data-goop-filled')).toBe(true)
    rerender(h(Range, { initial, goopRef, band: false }))
    await act(async () => {})
    expect(root.hasAttribute('data-goop-band')).toBe(false)
    expect(root.querySelector('[data-goop-part="calendar-band"]')).toBeNull()
  })

  it('while the end is picked, hovering a day previews the band up to it (mouse only)', async () => {
    const goopRef = createRef<CalendarHandle>()
    const { container } = render(h(Range, { goopRef }))
    const root = container.querySelector<HTMLElement>('[data-slot="calendar"]')!
    await act(async () => fireEvent.click(day(root, '2026-11-10')))
    expect(day(root, '2026-11-10').getAttribute('data-range-start')).toBe('true')
    // Touch: no preview (a tap must not leave one behind).
    await act(async () => fireEvent.pointerEnter(day(root, '2026-11-14'), { pointerType: 'touch' }))
    expect(day(root, '2026-11-12').getAttribute('data-range-preview')).toBe('false')
    await act(async () => fireEvent.pointerEnter(day(root, '2026-11-14'), { pointerType: 'mouse' }))
    expect(day(root, '2026-11-12').getAttribute('data-range-preview')).toBe('true')
    expect(day(root, '2026-11-15').getAttribute('data-range-preview')).toBe('false')
    await wait(600)
    expect(day(root, '2026-11-12').hasAttribute('data-goop-banded')).toBe(true)
    // Leaving the calendar clears it; picking the end ends the preview.
    await act(async () => fireEvent.pointerLeave(root, { pointerType: 'mouse' }))
    expect(day(root, '2026-11-12').getAttribute('data-range-preview')).toBe('false')
    await act(async () => fireEvent.click(day(root, '2026-11-14')))
    expect(day(root, '2026-11-14').getAttribute('data-range-end')).toBe('true')
    expect(root.querySelector('[data-range-preview]')).toBeNull()
  })
})

describe('hydration', () => {
  it('hydrates without mismatch, then the goo attaches', async () => {
    const app = (): ReactElement =>
      h(
        Fragment,
        null,
        h(GoopCalendar, { mode: 'single', selected: NOV, defaultMonth: NOV, today: TODAY }),
        h(GoopRangeCalendar, { selected: { from: NOV, to: new Date(2026, 10, 12) }, defaultMonth: NOV, today: TODAY }),
      )
    const html = renderToString(app())
    expect(html).not.toContain('data-goop-part')
    expect(html).not.toContain('data-goop-calendar')
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.append(root)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recoverable: unknown[] = []
    let r!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      r = hydrateRoot(root, app(), { onRecoverableError: (e) => recoverable.push(e) })
    })
    const messages = [...error.mock.calls, ...warn.mock.calls].map((c) => String(c[0]))
    error.mockRestore()
    warn.mockRestore()
    expect(recoverable).toEqual([])
    expect(messages.filter((m) => /hydrat|mismatch|did not match/i.test(m))).toEqual([])
    expect(root.querySelectorAll('[data-goop-calendar]')).toHaveLength(2)
    await act(async () => r.unmount())
    expect(activeTickerCount()).toBe(0)
  })
})

import { CalendarDate } from '@internationalized/date'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  CALENDAR_PROP_KEYS,
  GoopCalendar,
  GoopRangeCalendar,
  goopComponents,
  toCalendarOptions,
  type CalendarHandle,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

const NOV = new CalendarDate(2026, 11, 9)
type Exposed = { handle: CalendarHandle | null; el: HTMLElement | null }

const Single = defineComponent({
  props: { goo: { type: Boolean, default: true }, slosh: { type: [Boolean, Number], default: undefined } },
  setup(props, { expose }) {
    const value = ref<CalendarDate | undefined>(NOV)
    const cal = ref<Exposed | null>(null)
    expose({ value, cal })
    return () =>
      h(GoopCalendar, {
        ref: cal,
        modelValue: value.value,
        'onUpdate:modelValue': (v: CalendarDate) => (value.value = v),
        defaultPlaceholder: NOV,
        goo: props.goo,
        slosh: props.slosh,
      } as never)
  },
})

const day = (root: ParentNode, iso: string) => root.querySelector<HTMLElement>(`[data-reka-calendar-cell-trigger][data-value="${iso}"]:not([data-goop])`)!

describe('GoopCalendar', () => {
  it('is in the manifest; props map to core options', () => {
    for (const n of ['GoopCalendar', 'GoopCalendarCell', 'GoopCalendarCellTrigger', 'GoopCalendarHeading', 'GoopRangeCalendar', 'GoopRangeCalendarCellTrigger'])
      expect(goopComponents).toContain(n)
    for (const k of ['flow', 'pulse', 'band', 'slosh', 'focus', 'textFollow']) expect(CALENDAR_PROP_KEYS).toContain(k)
    expect(toCalendarOptions({ slosh: false, band: 0.5, speed: 2 }, { preset: 'subtle' })).toMatchObject({
      slosh: false,
      band: 0.5,
      speed: 2,
      preset: 'subtle',
    })
    expect(toCalendarOptions({ goo: false })).toBeNull()
  })

  it("renders shadcn's markup and attaches the goo on mount", async () => {
    const w = mount(Single, { attachTo: document.body })
    await flushPromises()
    const root = document.querySelector<HTMLElement>('[data-slot="calendar"]')!
    expect(root.className).toContain('group/calendar')
    expect(root.hasAttribute('data-goop-calendar')).toBe(true)
    expect(root.hasAttribute('data-goop-focus')).toBe(true)
    expect(root.querySelector('[data-slot="calendar-heading"]')!.textContent).toContain('2026')
    expect(root.querySelectorAll('[data-slot="calendar-cell-trigger"]').length).toBeGreaterThanOrEqual(28)
    expect(root.querySelector('[data-slot="calendar-prev-button"] svg')).not.toBeNull()
    expect(root.querySelector('[data-goop-part="calendar-selection"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(root.querySelector('[data-goop-part="calendar-band"]')).toBeNull()
    expect(day(root, '2026-11-09').hasAttribute('data-goop-filled')).toBe(true)
    w.unmount()
    expect(document.querySelector('[data-goop-part]')).toBeNull()
  })

  it('picking a day flows the goo there', async () => {
    const w = mount(Single, { attachTo: document.body })
    await flushPromises()
    const cal = (w.vm as unknown as { cal: Exposed }).cal
    const root = cal.el!
    day(root, '2026-11-20').click()
    await flushPromises()
    await nextTick()
    expect((w.vm as unknown as { value: CalendarDate }).value.toString()).toBe('2026-11-20')
    expect(day(root, '2026-11-20').hasAttribute('data-selected')).toBe(true)
    expect(cal.handle!.running).toBe(true)
    w.unmount()
  })

  it('paging the month sloshes the days; slosh: false does not', async () => {
    const w = mount(Single, { attachTo: document.body })
    await flushPromises()
    const cal = (w.vm as unknown as { cal: Exposed }).cal
    cal.el!.querySelector<HTMLElement>('[data-slot="calendar-next-button"]')!.click()
    await flushPromises()
    expect(cal.el!.querySelector('[data-slot="calendar-heading"]')!.textContent).toContain('December')
    expect(cal.handle!.sloshing).toBe(true)
    await w.setProps({ slosh: false })
    await flushPromises()
    cal.el!.querySelector<HTMLElement>('[data-slot="calendar-next-button"]')!.click()
    await flushPromises()
    expect(cal.handle!.sloshing).toBe(false)
    w.unmount()
  })

  it('goo: false is a plain shadcn Calendar', async () => {
    const w = mount(Single, { attachTo: document.body, props: { goo: false } })
    await flushPromises()
    const root = document.querySelector<HTMLElement>('[data-slot="calendar"]')!
    expect(root.hasAttribute('data-goop-calendar')).toBe(false)
    expect(root.querySelector('[data-goop-part]')).toBeNull()
    expect(day(root, '2026-11-09').className).toContain('data-[selected]:bg-primary')
    w.unmount()
  })
})

describe('GoopRangeCalendar', () => {
  it('fills the range as a band with primary caps', async () => {
    const value = { start: new CalendarDate(2026, 11, 9), end: new CalendarDate(2026, 11, 13) }
    const w = mount(GoopRangeCalendar, { attachTo: document.body, props: { modelValue: value, defaultPlaceholder: NOV } as never })
    await flushPromises()
    const root = document.querySelector<HTMLElement>('[data-slot="range-calendar"]')!
    expect(root.hasAttribute('data-goop-band')).toBe(true)
    expect(root.querySelector('[data-goop-part="calendar-band"]')).not.toBeNull()
    expect(day(root, '2026-11-11').hasAttribute('data-goop-banded')).toBe(true)
    expect(day(root, '2026-11-11').hasAttribute('data-goop-filled')).toBe(false)
    expect(day(root, '2026-11-13').hasAttribute('data-goop-filled')).toBe(true)
    expect(root.querySelector('[data-slot="range-calendar-trigger"]')).not.toBeNull()
    await w.setProps({ band: false } as never)
    await flushPromises()
    expect(root.hasAttribute('data-goop-band')).toBe(false)
    expect(root.querySelector('[data-goop-part="calendar-band"]')).toBeNull()
    w.unmount()
    expect(document.querySelector('[data-goop-part]')).toBeNull()
  })
})

describe('calendar hydration', () => {
  it('hydrates without mismatch warnings, then the goo attaches', async () => {
    const App = {
      render: () => [
        h(GoopCalendar, { modelValue: NOV, defaultPlaceholder: NOV }),
        h(GoopRangeCalendar, { modelValue: { start: NOV, end: NOV.add({ days: 3 }) }, defaultPlaceholder: NOV } as never),
      ],
    }
    const html = await renderToString(createSSRApp(App))
    expect(html).not.toContain('data-goop-part')
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.append(root)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createSSRApp(App)
    app.mount(root)
    await flushPromises()
    const messages = [...warn.mock.calls, ...error.mock.calls].map((c) => String(c[0]))
    expect(messages.filter((m) => /hydration|mismatch/i.test(m))).toEqual([])
    warn.mockRestore()
    error.mockRestore()
    expect(root.querySelectorAll('[data-goop-calendar]')).toHaveLength(2)
    app.unmount()
  })
})

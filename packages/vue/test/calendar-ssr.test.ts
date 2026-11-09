// @vitest-environment node
// Calendar and Range Calendar render on the server with no DOM: shadcn's markup, no goo layers.
import { CalendarDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

describe('Calendar / Range Calendar SSR', () => {
  it('renders without a DOM', async () => {
    const m = await import('../src')
    const day = new CalendarDate(2026, 11, 9)
    const app = createSSRApp({
      render: () =>
        h('div', [
          h(m.GoopCalendar, { modelValue: day, defaultPlaceholder: day }),
          h(m.GoopRangeCalendar, { modelValue: { start: day, end: day.add({ days: 4 }) }, defaultPlaceholder: day } as never),
        ]),
    })
    const html = await renderToString(app)
    expect(html).toContain('data-slot="calendar"')
    expect(html).toContain('data-slot="calendar-cell-trigger"')
    expect(html).toContain('data-slot="range-calendar"')
    expect(html).toContain('data-slot="range-calendar-trigger"')
    expect(html).toContain('data-selected')
    expect(html).not.toContain('data-goop-part')
    expect(html).not.toContain('data-goop-calendar')
  })
})

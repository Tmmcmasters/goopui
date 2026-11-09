// @vitest-environment node
// Server render of Calendar and Range Calendar with no DOM at all (react-dom/server, as Next.js
// does): any `document` / `window` access from goopUI's own code during render throws. The
// markup is deterministic, is shadcn's, and has no goo layer.
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const TRAPPED = ['document', 'window', 'AudioContext'] as const
const trap = (name: string) =>
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      const caller = new Error().stack?.split('\n')[2] ?? ''
      if (caller.includes('node_modules')) return undefined
      throw new Error(`${name} accessed during SSR`)
    },
  })
const untrap = () => {
  for (const name of TRAPPED) delete (globalThis as Record<string, unknown>)[name]
}

describe('SSR (react-dom/server): Calendar and Range Calendar', () => {
  it('renders without a DOM, deterministically, with no goo', async () => {
    const m = await import('../src')
    const NOV = new Date(2026, 10, 9)
    const TODAY = new Date(2026, 10, 2)
    const view = () =>
      h(
        'div',
        null,
        h(m.GoopCalendar, { mode: 'single', selected: NOV, defaultMonth: NOV, today: TODAY, slosh: false }),
        h(m.GoopRangeCalendar, { selected: { from: NOV, to: new Date(2026, 10, 12) }, defaultMonth: NOV, today: TODAY, band: 2 }),
      )
    for (const name of TRAPPED) trap(name)
    let a: string
    let b: string
    try {
      a = renderToString(view())
      b = renderToString(view())
    } finally {
      untrap()
    }
    expect(a).toBe(b)
    expect(a).toContain('data-slot="calendar"')
    expect(a).toContain('data-goop-host="calendar"')
    expect(a).toContain('data-goop-host="range-calendar"')
    expect(a).toContain('data-selected-single="true"')
    expect(a).toContain('data-range-start="true"')
    expect(a).not.toContain('data-goop-part')
    expect(a).not.toContain('data-goop-calendar')
    expect(a).not.toContain('data-range-preview')
    expect(a).not.toContain('slosh')
  })
})

// @vitest-environment node
// Bespoke batch 1 server render with no DOM at all (react-dom/server, as Next.js does for client
// components). Any `document` / `window` access from goopUI's own code during render throws
// (dependencies may feature-detect: cmdk, sonner and input-otp read `typeof window`). Checks the
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

async function render(view: () => React.ReactElement): Promise<string> {
  for (const name of TRAPPED) trap(name)
  try {
    const a = renderToString(view())
    const b = renderToString(view())
    expect(a).toBe(b)
    expect(a).not.toContain('data-goop-active')
    expect(a).not.toContain('data-goop="layer"')
    expect(a).not.toContain('data-goop="highlight"')
    return a
  } finally {
    untrap()
  }
}

describe('SSR (react-dom/server): bespoke batch 1', () => {
  it("GoopToaster renders sonner's section", async () => {
    const { GoopToaster } = await import('../src')
    const html = await render(() => h(GoopToaster, { dropIn: false, speed: 2 }))
    expect(html).toContain('<section')
    expect(html).toContain('Notifications')
    expect(html).not.toContain('dropIn')
  })

  it('GoopCommand renders shadcn markup: cmdk root, input box, groups, no empty state', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        m.GoopCommand,
        { preset: 'wild' },
        h(m.GoopCommandInput, { placeholder: 'Search' }),
        h(
          m.GoopCommandList,
          null,
          h(m.GoopCommandEmpty, null, 'No results found.'),
          h(m.GoopCommandGroup, { heading: 'Suggestions' }, h(m.GoopCommandItem, { value: 'Calendar' }, 'Calendar')),
          h(m.GoopCommandSeparator),
          h(m.GoopCommandItem, { value: 'Profile' }, 'Profile', h(m.GoopCommandShortcut, null, '⌘P')),
        ),
      ),
    )
    expect(html).toContain('data-slot="command"')
    expect(html).toContain('cmdk-root')
    expect(html).toContain('data-slot="command-input-goo"')
    expect(html).toContain('data-slot="command-list"')
    expect(html).toContain('cmdk-group-heading')
    expect(html).toContain('Calendar')
    expect(html).not.toContain('No results found.')
    expect(html).not.toContain('preset')
  })

  it('GoopCombobox renders the anchor, input and chevron (the list stays closed)', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        m.GoopCombobox,
        { defaultValue: 'nuxt' },
        h(m.GoopComboboxAnchor, null, h(m.GoopComboboxInput, { displayValue: (v: string) => v.toUpperCase() }), h(m.GoopComboboxTrigger, { 'aria-label': 'Show' })),
        h(m.GoopComboboxList, null, h(m.GoopComboboxItem, { value: 'nuxt' }, 'Nuxt', h(m.GoopComboboxItemIndicator))),
      ),
    )
    expect(html).toContain('data-slot="combobox-anchor"')
    expect(html).toContain('data-slot="combobox-input"')
    expect(html).toContain('value="NUXT"')
    expect(html).toContain('data-slot="combobox-trigger"')
    expect(html).not.toContain('data-slot="combobox-list"')
  })

  it('GoopNumberField renders the formatted value and the steppers', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        m.GoopNumberField,
        { defaultValue: 1234.5, formatOptions: { style: 'currency', currency: 'USD' }, squish: false },
        h(m.GoopNumberFieldContent, null, h(m.GoopNumberFieldDecrement), h(m.GoopNumberFieldInput), h(m.GoopNumberFieldIncrement)),
      ),
    )
    expect(html).toContain('data-slot="number-field"')
    expect(html).toContain('data-goop-host="number-field"')
    expect(html).toContain('value="$1,234.50"')
    expect(html).toContain('role="spinbutton"')
    expect(html).toContain('data-slot="increment"')
    expect(html).toContain('aria-label="Decrease"')
    expect(html).not.toContain('squish')
  })

  it('GoopInputOTP renders input-otp with shadcn slots', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(m.GoopInputOTP, { maxLength: 4, flow: false }, h(m.GoopInputOTPGroup, null, ...[0, 1, 2, 3].map((i) => h(m.GoopInputOTPSlot, { key: i, index: i })))),
    )
    expect(html).toContain('data-input-otp-container')
    expect(html).toContain('data-slot="input-otp"')
    expect(html.match(/data-slot="input-otp-slot"/g)!.length).toBe(4)
    expect(html).not.toContain('data-goop-host')
    expect(html).not.toContain('flow=')
  })
})

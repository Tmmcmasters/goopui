// Bespoke batch 1: server markup hydrates on the client with no mismatch, then the goo attaches
// (react-dom/server + hydrateRoot, the same path as Next.js).
import { act, createElement as h, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  GoopCombobox,
  GoopComboboxAnchor,
  GoopComboboxInput,
  GoopComboboxItem,
  GoopComboboxList,
  GoopComboboxTrigger,
  GoopCommand,
  GoopCommandEmpty,
  GoopCommandGroup,
  GoopCommandInput,
  GoopCommandItem,
  GoopCommandList,
  GoopInputOTP,
  GoopInputOTPGroup,
  GoopInputOTPSlot,
  GoopNumberField,
  GoopNumberFieldContent,
  GoopNumberFieldDecrement,
  GoopNumberFieldIncrement,
  GoopNumberFieldInput,
  GoopProvider,
  GoopToaster,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

beforeAll(() => {
  Element.prototype.scrollIntoView ??= function () {}
})

afterEach(() => {
  document.body.innerHTML = ''
})

async function hydrate(app: () => ReactElement) {
  const html = renderToString(app())
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
  await act(async () => new Promise((res) => setTimeout(res, 0)))
  const messages = [...error.mock.calls, ...warn.mock.calls].map((c) => String(c[0]))
  error.mockRestore()
  warn.mockRestore()
  return { root, r, messages, recoverable }
}

describe('hydration: bespoke batch 1', () => {
  it('hydrates Toaster, Command, Combobox, NumberField and InputOTP without mismatch, then the goo attaches', async () => {
    const App = () =>
      h(
        GoopProvider,
        { preset: 'playful', sound: true },
        h(GoopToaster),
        h(
          GoopCommand,
          null,
          h(GoopCommandInput, { placeholder: 'Search' }),
          h(GoopCommandList, null, h(GoopCommandEmpty, null, 'None'), h(GoopCommandGroup, { heading: 'Suggestions' }, h(GoopCommandItem, { value: 'A' }, 'A'), h(GoopCommandItem, { value: 'B' }, 'B'))),
        ),
        h(
          GoopCombobox,
          { defaultValue: 'nuxt' },
          h(GoopComboboxAnchor, null, h(GoopComboboxInput, { displayValue: (v: string) => v }), h(GoopComboboxTrigger, { 'aria-label': 'Show' })),
          h(GoopComboboxList, null, h(GoopComboboxItem, { value: 'nuxt' }, 'Nuxt')),
        ),
        h(
          GoopNumberField,
          { defaultValue: 24.5, step: 0.5, formatOptions: { style: 'currency', currency: 'USD' } },
          h(GoopNumberFieldContent, null, h(GoopNumberFieldDecrement), h(GoopNumberFieldInput), h(GoopNumberFieldIncrement)),
        ),
        h(GoopInputOTP, { maxLength: 4 }, h(GoopInputOTPGroup, null, ...[0, 1, 2, 3].map((i) => h(GoopInputOTPSlot, { key: i, index: i })))),
      )
    const { root, r, messages, recoverable } = await hydrate(App)
    expect(messages.filter((m) => /hydrat|mismatch|did not match/i.test(m))).toEqual([])
    expect(recoverable).toEqual([])

    // Command: highlight in cmdk's list, ring on the input.
    expect(root.querySelector('[data-slot="command-list"] [cmdk-list-sizer] > [data-goop="highlight"]')).not.toBeNull()
    expect(root.querySelector('[data-slot="command-input-goo"]')!.hasAttribute('data-goop-active')).toBe(true)
    // Combobox input ring.
    expect(root.querySelector('[data-slot="combobox-input-goo"]')!.hasAttribute('data-goop-active')).toBe(true)
    // NumberField host and InputOTP container.
    expect(root.querySelector('[data-slot="number-field-content"]')!.hasAttribute('data-goop-active')).toBe(true)
    expect(root.querySelector('[data-input-otp-container]')!.getAttribute('data-goop-host')).toBe('input-otp')

    await act(async () => r.unmount())
    expect(document.querySelector('[data-goop]')).toBeNull()
  })
})

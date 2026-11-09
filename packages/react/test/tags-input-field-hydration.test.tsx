// Tags Input and Field server markup hydrates on the client with no mismatch, then the goo
// attaches (react-dom/server + hydrateRoot, the same path as Next.js).
import { activeTickerCount } from '@goopui/core'
import { act, createElement as h, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoopField,
  GoopFieldDescription,
  GoopFieldError,
  GoopFieldLabel,
  GoopInput,
  GoopProvider,
  GoopTagsInput,
  GoopTagsInputInput,
  GoopTagsInputItem,
  GoopTagsInputItemDelete,
  GoopTagsInputItemText,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

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
  const messages = [...error.mock.calls, ...warn.mock.calls].map((c) => String(c[0]))
  error.mockRestore()
  warn.mockRestore()
  return { root, r, messages, recoverable }
}

describe('hydration: Tags Input and Field', () => {
  it('hydrates without mismatch, then the goo attaches', async () => {
    const App = () =>
      h(
        GoopProvider,
        { preset: 'playful', sound: true },
        h(
          GoopTagsInput,
          { defaultValue: ['react', 'next'] },
          h(GoopTagsInputItem, { value: 'react' }, h(GoopTagsInputItemText), h(GoopTagsInputItemDelete)),
          h(GoopTagsInputItem, { value: 'next' }, h(GoopTagsInputItemText), h(GoopTagsInputItemDelete)),
          h(GoopTagsInputInput, { placeholder: 'Add…' }),
        ),
        h(
          GoopField,
          { ...{ 'data-invalid': true }, orientation: 'vertical' },
          h(GoopFieldLabel, { htmlFor: 'e' }, 'Email'),
          h(GoopInput, { id: 'e', 'aria-invalid': true }),
          h(GoopFieldDescription, null, 'We never share it.'),
          h(GoopFieldError, { errors: [{ message: 'Enter a valid email.' }] }),
        ),
      )
    const { root, r, messages, recoverable } = await hydrate(App)
    expect(messages.filter((m) => /hydrat|mismatch|did not match/i.test(m))).toEqual([])
    expect(recoverable).toEqual([])
    expect(root.querySelector('[data-slot="tags-input-goo"][data-goop-active]')).not.toBeNull()
    expect(root.querySelector('[data-slot="input-goo"][data-goop-active]')).not.toBeNull()
    expect(root.querySelector('[data-slot="field-error"]')!.textContent).toBe('Enter a valid email.')
    await act(async () => r.unmount())
    expect(document.querySelector('[data-goop-part]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })
})

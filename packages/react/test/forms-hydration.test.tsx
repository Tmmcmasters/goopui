// The forms batch's server markup hydrates on the client with no mismatch, then the goo
// attaches (like hydration.test.tsx). Uses react-dom/server + hydrateRoot, the same path as
// Next.js.
import { act, createElement as h, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoopInput,
  GoopProgress,
  GoopProvider,
  GoopRadioGroup,
  GoopRadioGroupItem,
  GoopSlider,
  GoopTextarea,
  GoopToggle,
  GoopToggleGroup,
  GoopToggleGroupItem,
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

describe('hydration: forms batch', () => {
  it('hydrates every forms component without mismatch, then the goo attaches', async () => {
    const App = () =>
      h(
        GoopProvider,
        { preset: 'playful', sound: true },
        h(GoopInput, { type: 'email', placeholder: 'you@example.com', defaultValue: 'a@b.co' }),
        h(GoopTextarea, { placeholder: 'Message' }),
        h(GoopRadioGroup, { defaultValue: 'a' }, h(GoopRadioGroupItem, { value: 'a' }), h(GoopRadioGroupItem, { value: 'b' })),
        h(GoopSlider, { defaultValue: [30, 70] }),
        h(GoopProgress, { value: 45 }),
        h(GoopToggle, { defaultPressed: true }, 'B'),
        h(GoopToggleGroup, { type: 'single', defaultValue: 'l', variant: 'outline' }, h(GoopToggleGroupItem, { value: 'l' }, 'L'), h(GoopToggleGroupItem, { value: 'r' }, 'R')),
        h(GoopToggleGroup, { type: 'multiple', defaultValue: ['b'] }, h(GoopToggleGroupItem, { value: 'b' }, 'B'), h(GoopToggleGroupItem, { value: 'i' }, 'I')),
      )
    const { root, r, messages, recoverable } = await hydrate(App)
    expect(messages.filter((m) => /hydrat|mismatch|did not match/i.test(m))).toEqual([])
    expect(recoverable).toEqual([])

    const hosts = root.querySelectorAll('[data-goop-host]')
    // input, textarea, radio group, slider, progress, toggle, two toggle groups.
    expect(hosts.length).toBe(8)
    for (const host of hosts) {
      expect(host.hasAttribute('data-goop-active'), host.outerHTML.slice(0, 80)).toBe(true)
      expect(host.querySelector('[data-goop="layer"]'), host.outerHTML.slice(0, 80)).not.toBeNull()
    }
    expect((root.querySelector('[data-slot="input"]') as HTMLInputElement).value).toBe('a@b.co')

    await act(async () => r.unmount())
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
  })
})

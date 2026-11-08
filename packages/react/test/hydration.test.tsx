// Server markup hydrates on the client with no mismatch, then the goo attaches (like the Vue
// hydration test). Uses react-dom/server + hydrateRoot, the same path as Next.js.
import type { SkeletonRevealHandle } from '@goopui/core'
import { act, createElement as h, createRef, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoopButton, GoopCheckbox, GoopDialog, GoopDialogContent, GoopDialogTitle, GoopDialogTrigger, GoopProvider, GoopSwitch, GoopTabs, GoopTabsList, GoopTabsTrigger } from '../src'

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

describe('hydration', () => {
  it('hydrates every pilot without mismatch, then attaches the goo', async () => {
    const App = () =>
      h(
        GoopProvider,
        { preset: 'playful', sound: true },
        h(GoopButton, { id: 'a' }, 'One'),
        h(GoopButton, { variant: 'outline' }, 'Two'),
        h(GoopButton, { variant: 'link' }, 'Three'),
        h(GoopSwitch, { defaultChecked: true }),
        h(GoopCheckbox),
        h(GoopTabs, { defaultValue: 'a' }, h(GoopTabsList, null, h(GoopTabsTrigger, { value: 'a' }, 'A'), h(GoopTabsTrigger, { value: 'b' }, 'B'))),
        h(GoopDialog, null, h(GoopDialogTrigger, { asChild: true }, h(GoopButton, null, 'Open')), h(GoopDialogContent, null, h(GoopDialogTitle, null, 'Hi'))),
      )
    const { root, r, messages, recoverable } = await hydrate(App)
    expect(messages.filter((m) => /hydrat|mismatch|did not match/i.test(m))).toEqual([])
    expect(recoverable).toEqual([])

    const hosts = root.querySelectorAll('[data-goop-host]')
    // 3 buttons (link has no goo) + 1 dialog trigger button, switch, checkbox.
    expect(hosts.length).toBe(5)
    for (const host of hosts) expect(host.hasAttribute('data-goop-active'), host.outerHTML.slice(0, 80)).toBe(true)
    for (const btn of root.querySelectorAll('[data-slot="button"][data-goop-host]')) expect(btn.querySelector(':scope > [data-goop="layer"]')).not.toBeNull()
    expect(root.querySelector('[data-slot="switch"]')!.querySelectorAll('[data-goop="layer"]').length).toBe(2)
    expect(root.querySelector('[data-goop-tabs]')!.hasAttribute('data-goop-menu')).toBe(true)

    await act(async () => r.unmount())
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('hydrates batch 1 without mismatch, then the goo attaches (spinner, card, reveal)', async () => {
    const m = await import('../src')
    const reveal = createRef<SkeletonRevealHandle>()
    const App = () =>
      h(
        GoopProvider,
        { preset: 'playful' },
        h(m.GoopSkeleton, { className: 'h-4 w-20' }),
        h(m.GoopSkeletonReveal, { loading: true, goopRef: reveal, skeleton: h(m.GoopSkeleton, { className: 'size-12' }) }, h('p', null, 'Loaded')),
        h(m.GoopBadge, { variant: 'outline' }, 'Badge'),
        h(m.GoopCard, { goo: true }, h(m.GoopCardHeader, null, h(m.GoopCardTitle, null, 'Title')), h(m.GoopCardContent, null, 'Body')),
        h(m.GoopAvatar, null, h(m.GoopAvatarFallback, null, 'AL')),
        h(m.GoopSeparator),
        h(m.GoopLabel, null, 'Email'),
        h(m.GoopSpinner, { className: 'size-6' }),
      )
    const { root, r, messages, recoverable } = await hydrate(App)
    expect(messages.filter((msg) => /hydrat|mismatch|did not match/i.test(msg))).toEqual([])
    expect(recoverable).toEqual([])
    const spinner = root.querySelector('[data-slot="spinner"]')!
    expect(spinner.hasAttribute('data-goop-active')).toBe(true)
    expect(spinner.querySelector(':scope > svg filter')).toBeNull()
    expect(root.querySelector('[data-slot="card"] > svg[data-goop="card"]')).not.toBeNull()
    expect(reveal.current).not.toBeNull()
    await act(async () => r.unmount())
    expect(document.querySelector('[data-goop]')).toBeNull()
  })
})


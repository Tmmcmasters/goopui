// The bloom overlays' server markup hydrates with no mismatch, then each panel blooms when it
// opens (the goo only ever attaches on the client, after hydration).
import { act, fireEvent } from '@testing-library/react'
import { createElement as h, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as m from '../src'

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

describe('hydration: bloom overlays', () => {
  it('hydrates without mismatch, then each panel blooms on open', async () => {
    const App = () =>
      h(
        m.GoopProvider,
        { preset: 'playful', sound: true },
        h(m.GoopPopover, null, h(m.GoopPopoverTrigger, { asChild: true }, h(m.GoopButton, null, 'Popover')), h(m.GoopPopoverContent, null, 'Body')),
        h(m.GoopTooltipProvider, null, h(m.GoopTooltip, null, h(m.GoopTooltipTrigger, null, 'Tip'), h(m.GoopTooltipContent, null, 'Tooltip'))),
        h(m.GoopHoverCard, null, h(m.GoopHoverCardTrigger, { href: '#' }, '@nextjs'), h(m.GoopHoverCardContent, null, 'Card')),
        h(m.GoopAlertDialog, null, h(m.GoopAlertDialogTrigger, null, 'Alert'), h(m.GoopAlertDialogContent, null, h(m.GoopAlertDialogTitle, null, 'Sure?'))),
        h(m.GoopSheet, null, h(m.GoopSheetTrigger, null, 'Sheet'), h(m.GoopSheetContent, null, h(m.GoopSheetTitle, null, 'Sheet'))),
      )
    const { root, r, messages, recoverable } = await hydrate(App)
    expect(messages.filter((msg) => /hydrat|mismatch|did not match/i.test(msg))).toEqual([])
    expect(recoverable).toEqual([])
    expect(document.querySelector('[data-goop-emerge]')).toBeNull()

    const click = (name: string) => act(() => fireEvent.click([...root.querySelectorAll('button')].find((b) => b.textContent === name)!))
    click('Popover')
    expect(document.querySelector('[data-slot="popover-content"][data-goop-emerge]')).not.toBeNull()
    click('Popover')
    click('Alert')
    expect(document.querySelector('[data-slot="alert-dialog-content"][data-goop-emerge]')).not.toBeNull()

    await act(async () => r.unmount())
    expect(document.querySelector('[data-goop="surface"]')).toBeNull()
  })

  it('a sheet hydrates and blooms from its edge', async () => {
    const App = () => h(m.GoopSheet, null, h(m.GoopSheetTrigger, null, 'Sheet'), h(m.GoopSheetContent, { side: 'top' }, h(m.GoopSheetTitle, null, 'Sheet')))
    const { root, r, messages, recoverable } = await hydrate(App)
    expect(messages.filter((msg) => /hydrat|mismatch|did not match/i.test(msg))).toEqual([])
    expect(recoverable).toEqual([])
    act(() => fireEvent.click(root.querySelector('button')!))
    expect(document.querySelector('[data-slot="sheet-content"][data-side="top"][data-goop-emerge]')).not.toBeNull()
    await act(async () => r.unmount())
  })
})

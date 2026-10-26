// SSR markup hydrates on the client with no mismatch, then the goo attaches.
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { GoopButton } from '../src'

describe('hydration', () => {
  it('hydrates without mismatch warnings and attaches after mount', async () => {
    const App = {
      render: () => [
        h(GoopButton, { variant: 'default', id: 'a' }, () => 'One'),
        h(GoopButton, { variant: 'outline' }, () => 'Two'),
        h(GoopButton, { variant: 'link' }, () => 'Three'),
      ],
    }
    const html = await renderToString(createSSRApp(App))
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

    const hosts = root.querySelectorAll('[data-goop-host]')
    expect(hosts.length).toBe(2) // link has no goo
    for (const host of hosts) {
      expect(host.hasAttribute('data-goop-active')).toBe(true)
      expect(host.querySelector(':scope > [data-goop="layer"]')).not.toBeNull()
    }
    app.unmount()
    expect(root.querySelector('[data-goop="layer"]')).toBeNull()
  })
})

// @vitest-environment node
// GoopToaster server render: stable markup identical to plain Sonner, no goo (the engine only
// attaches in the browser on mount). vue-sonner itself probes `window` during setup.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

describe('GoopToaster SSR', () => {
  it('renders the same markup as plain shadcn Sonner', async () => {
    const { GoopToaster } = await import('../src')
    const app = (goo: boolean) => createSSRApp({ render: () => h(GoopToaster, { goo, position: 'top-center' }) })
    const apps = [app(true), app(true), app(false)]
    const a = await renderToString(apps[0]!)
    expect(a).toBe(await renderToString(apps[1]!))
    expect(a).toBe(await renderToString(apps[2]!))
    expect(a).toContain('aria-label="Notifications')
    expect(a).not.toContain('data-goop')
  })
})

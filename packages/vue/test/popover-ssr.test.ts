// @vitest-environment node
// GoopPopover server render: no document/window access, stable markup, and no goo attached
// (the engine only attaches in the browser once the content element mounts).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString, type SSRContext } from 'vue/server-renderer'

const trap = (name: string) =>
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(`${name} accessed during SSR`)
    },
  })

describe('GoopPopover SSR', () => {
  it('renders closed and default-open popovers without touching the DOM', async () => {
    const { GoopPopover, GoopPopoverContent, GoopPopoverTitle, GoopPopoverTrigger } = await import('../src')
    const app = (defaultOpen: boolean) =>
      createSSRApp({
        render: () =>
          h(GoopPopover, { defaultOpen }, () => [
            h(GoopPopoverTrigger, null, () => 'Open'),
            h(GoopPopoverContent, { side: 'top' }, () => h(GoopPopoverTitle, null, () => 'Title')),
          ]),
      })
    const apps = [app(false), app(false), app(true)]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('data-slot="popover-trigger"')
      expect(a).toContain('aria-expanded="false"')
      const ctx: SSRContext = {}
      const open = await renderToString(apps[2]!, ctx)
      const all = open + Object.values(ctx.teleports ?? {}).join('')
      expect(all).toContain('aria-expanded="true"')
      expect(all).not.toContain('data-goop-emerge')
      expect(all).not.toContain('data-goop="layer"')
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })
})

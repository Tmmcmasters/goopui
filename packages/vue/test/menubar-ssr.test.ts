// @vitest-environment node
// GoopMenubar server render: no document/window access, stable markup, no goo attached (the
// trigger highlight and the menus' goo only attach in the browser).
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

describe('GoopMenubar SSR', () => {
  it('renders without touching the DOM', async () => {
    const {
      GoopMenubar,
      GoopMenubarContent,
      GoopMenubarItem,
      GoopMenubarMenu,
      GoopMenubarSub,
      GoopMenubarSubContent,
      GoopMenubarSubTrigger,
      GoopMenubarTrigger,
    } = await import('../src')
    const app = (open: string) =>
      createSSRApp({
        render: () =>
          h(GoopMenubar, { defaultValue: open }, () => [
            h(GoopMenubarMenu, { value: 'file' }, () => [
              h(GoopMenubarTrigger, null, () => 'File'),
              h(GoopMenubarContent, null, () => [
                h(GoopMenubarItem, null, () => 'New Tab'),
                h(GoopMenubarSub, null, () => [
                  h(GoopMenubarSubTrigger, null, () => 'Share'),
                  h(GoopMenubarSubContent, null, () => h(GoopMenubarItem, null, () => 'Email link')),
                ]),
              ]),
            ]),
          ]),
      })
    const apps = [app(''), app(''), app('file')]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps.shift()!)
      const b = await renderToString(apps.shift()!)
      expect(a).toBe(b)
      expect(a).toContain('data-slot="menubar-trigger"')
      expect(a).toContain('data-goop-menubar')
      expect(a).not.toContain('data-goop="highlight"')
      const ctx: SSRContext = {}
      const open = await renderToString(apps.shift()!, ctx)
      const all = open + Object.values(ctx.teleports ?? {}).join('')
      expect(all).not.toContain('data-goop-emerge')
      expect(all).not.toContain('data-goop="layer"')
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })
})

// @vitest-environment node
// GoopDropdownMenu server render: no document/window access, stable markup, and no goo attached
// (emerge and the highlight only attach in the browser once the content mounts).
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

describe('GoopDropdownMenu SSR', () => {
  it('renders closed and default-open menus without touching the DOM', async () => {
    const {
      GoopDropdownMenu,
      GoopDropdownMenuContent,
      GoopDropdownMenuItem,
      GoopDropdownMenuCheckboxItem,
      GoopDropdownMenuSub,
      GoopDropdownMenuSubContent,
      GoopDropdownMenuSubTrigger,
      GoopDropdownMenuTrigger,
    } = await import('../src')
    const app = (defaultOpen: boolean) =>
      createSSRApp({
        render: () =>
          h(GoopDropdownMenu, { defaultOpen }, () => [
            h(GoopDropdownMenuTrigger, null, () => 'Open'),
            h(GoopDropdownMenuContent, null, () => [
              h(GoopDropdownMenuItem, { variant: 'destructive' }, () => 'Log out'),
              h(GoopDropdownMenuCheckboxItem, { modelValue: true }, () => 'Status bar'),
              h(GoopDropdownMenuSub, null, () => [
                h(GoopDropdownMenuSubTrigger, null, () => 'More'),
                h(GoopDropdownMenuSubContent, null, () => h(GoopDropdownMenuItem, null, () => 'Nested')),
              ]),
            ]),
          ]),
      })
    const apps = [app(false), app(false), app(true)]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('data-slot="dropdown-menu-trigger"')
      expect(a).toContain('aria-expanded="false"')
      const ctx: SSRContext = {}
      const open = await renderToString(apps[2]!, ctx)
      const all = open + Object.values(ctx.teleports ?? {}).join('')
      expect(all).toContain('aria-expanded="true"')
      expect(all).not.toContain('data-goop-emerge')
      expect(all).not.toContain('data-goop="highlight"')
      expect(all).not.toContain('data-goop="layer"')
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })
})

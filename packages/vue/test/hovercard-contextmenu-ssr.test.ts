// @vitest-environment node
// GoopHoverCard / GoopContextMenu server render: no document/window access, stable markup, no
// goo attached (it only attaches in the browser once the content mounts).
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

describe('GoopHoverCard / GoopContextMenu SSR', () => {
  it('render without touching the DOM', async () => {
    const {
      GoopHoverCard,
      GoopHoverCardContent,
      GoopHoverCardTrigger,
      GoopContextMenu,
      GoopContextMenuContent,
      GoopContextMenuItem,
      GoopContextMenuSub,
      GoopContextMenuSubContent,
      GoopContextMenuSubTrigger,
      GoopContextMenuTrigger,
    } = await import('../src')
    const app = (defaultOpen: boolean) =>
      createSSRApp({
        render: () => [
          h(GoopHoverCard, { defaultOpen }, () => [
            h(GoopHoverCardTrigger, { href: '#' }, () => '@vuejs'),
            h(GoopHoverCardContent, null, () => h('p', 'Card')),
          ]),
          h(GoopContextMenu, null, () => [
            h(GoopContextMenuTrigger, null, () => 'Right-click'),
            h(GoopContextMenuContent, null, () => [
              h(GoopContextMenuItem, null, () => 'Back'),
              h(GoopContextMenuSub, null, () => [
                h(GoopContextMenuSubTrigger, null, () => 'More'),
                h(GoopContextMenuSubContent, null, () => h(GoopContextMenuItem, null, () => 'Nested')),
              ]),
            ]),
          ]),
        ],
      })
    const apps = [app(false), app(false), app(true)]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps.shift()!)
      const b = await renderToString(apps.shift()!)
      expect(a).toBe(b)
      expect(a).toContain('data-slot="hover-card-trigger"')
      expect(a).toContain('data-slot="context-menu-trigger"')
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

// @vitest-environment node
// GoopTabs / GoopTooltip server render: no document/window access, stable markup, and no goo
// attached (the engines only attach in the browser on mount).
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
const untrap = () => {
  delete (globalThis as Record<string, unknown>).document
  delete (globalThis as Record<string, unknown>).window
}

describe('GoopTabs SSR', () => {
  it('renders shadcn markup with the active tab, no blob', async () => {
    const { GoopTabs, GoopTabsContent, GoopTabsList, GoopTabsTrigger } = await import('../src')
    const app = () =>
      createSSRApp({
        render: () =>
          h(GoopTabs, { defaultValue: 'b' }, () => [
            h(GoopTabsList, null, () => [
              h(GoopTabsTrigger, { value: 'a' }, () => 'A'),
              h(GoopTabsTrigger, { value: 'b' }, () => 'B'),
            ]),
            h(GoopTabsContent, { value: 'b' }, () => 'B body'),
          ]),
      })
    const apps = [app(), app()]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('data-slot="tabs-list"')
      expect(a).toContain('data-goop-tabs')
      expect(a).toContain('data-state="active"')
      expect(a).toContain('B body')
      expect(a).not.toContain('data-goop="highlight"')
      expect(a).not.toContain('data-goop-menu')
    } finally {
      untrap()
    }
  })
})

describe('GoopTooltip SSR', () => {
  it('renders closed and default-open tooltips without touching the DOM', async () => {
    const { GoopTooltip, GoopTooltipContent, GoopTooltipProvider, GoopTooltipTrigger } = await import('../src')
    const app = (defaultOpen: boolean) =>
      createSSRApp({
        render: () =>
          h(GoopTooltipProvider, null, () =>
            h(GoopTooltip, { defaultOpen }, () => [
              h(GoopTooltipTrigger, null, () => 'Hover'),
              h(GoopTooltipContent, null, () => 'Tip'),
            ]),
          ),
      })
    const apps = [app(false), app(false), app(true)]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('data-slot="tooltip-trigger"')
      const ctx: SSRContext = {}
      const open = await renderToString(apps[2]!, ctx)
      const all = open + Object.values(ctx.teleports ?? {}).join('')
      expect(all).not.toContain('data-goop-emerge')
      expect(all).not.toContain('data-goop="layer"')
    } finally {
      untrap()
    }
  })
})

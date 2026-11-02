// @vitest-environment node
// GoopDialog / GoopAlertDialog server render: no document/window access, stable markup, and no
// goo attached (the engine only attaches in the browser once the content mounts).
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

describe('GoopDialog SSR', () => {
  it('renders closed and default-open dialogs without touching the DOM', async () => {
    const m = await import('../src')
    const dialog = (defaultOpen: boolean) =>
      createSSRApp({
        render: () =>
          h(m.GoopDialog, { defaultOpen }, () => [
            h(m.GoopDialogTrigger, null, () => 'Open'),
            h(m.GoopDialogContent, null, () => h(m.GoopDialogTitle, null, () => 'Title')),
          ]),
      })
    const alert = () =>
      createSSRApp({
        render: () =>
          h(m.GoopAlertDialog, { defaultOpen: true }, () => [
            h(m.GoopAlertDialogTrigger, null, () => 'Delete'),
            h(m.GoopAlertDialogContent, null, () => [
              h(m.GoopAlertDialogTitle, null, () => 'Sure?'),
              h(m.GoopAlertDialogAction, null, () => 'Yes'),
            ]),
          ]),
      })
    const apps = [dialog(false), dialog(false), dialog(true), alert()]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('data-slot="dialog-trigger"')
      for (const app of [apps[2]!, apps[3]!]) {
        const ctx: SSRContext = {}
        const html = await renderToString(app, ctx)
        const all = html + Object.values(ctx.teleports ?? {}).join('')
        expect(all).toContain('aria-expanded="true"')
        expect(all).not.toContain('data-goop-emerge')
        expect(all).not.toContain('data-goop-backdrop')
        expect(all).not.toContain('data-goop="layer"')
      }
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })
})

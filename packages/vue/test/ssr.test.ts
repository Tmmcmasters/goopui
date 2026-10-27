// @vitest-environment node
// Server render with no DOM at all. Imports may feature-detect (reka-ui does
// `typeof document`), so the trap goes in after importing: any `document` / `window` access
// during setup or render then throws. Also checks the markup is deterministic and has no
// goo layer.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const trap = (name: string) =>
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(`${name} accessed during SSR`)
    },
  })

describe('SSR', () => {
  it('renders without touching document/window, with stable markup', async () => {
    const { GoopButton } = await import('../src')
    // Vue's createSSRApp probes `window` for devtools; build the apps before trapping.
    const app = () =>
      createSSRApp({
        render: () => [
          h(GoopButton, { variant: 'destructive', shockwave: false }, () => 'Delete'),
          h(GoopButton, { variant: 'outline', asChild: true }, () => h('a', { href: '/' }, 'Home')),
        ],
      })
    const apps = [app(), app()]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('data-goop-label')
      expect(a).toContain('data-goop-host="fill"')
      expect(a).not.toContain('data-goop-active')
      expect(a).not.toContain('data-goop="layer"')
      expect(a).not.toContain('background-color:transparent')
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })

  it('GoopSpinner renders a static goo SVG with no document/window access', async () => {
    const { GoopSpinner } = await import('../src')
    const app = () =>
      createSSRApp({
        render: () => [h(GoopSpinner), h(GoopSpinner, { class: 'size-12', blobs: 6, preset: 'wild' })],
      })
    const apps = [app(), app()]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('role="status"')
      expect(a).toContain('aria-label="Loading"')
      expect(a).toContain('<filter id="goop-spinner-')
      expect(a.match(/<circle /g)!.length).toBeGreaterThanOrEqual(4 + 6)
      expect(a).not.toContain('data-goop-active')
      expect(a).not.toContain('data-goop="layer"')
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })

  it('GoopSwitch renders a plain shadcn switch with no document/window access', async () => {
    const { GoopSwitch } = await import('../src')
    const app = () =>
      createSSRApp({
        render: () => [h(GoopSwitch), h(GoopSwitch, { modelValue: true, size: 'sm', bridge: false })],
      })
    const apps = [app(), app()]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a).toContain('role="switch"')
      expect(a).toContain('aria-checked="false"')
      expect(a).toContain('aria-checked="true"')
      expect(a).toContain('data-slot="switch-thumb"')
      expect(a).toContain('data-goop-host="switch"')
      expect(a).toContain('data-checked:bg-primary')
      expect(a).not.toContain('data-goop-active')
      expect(a).not.toContain('data-goop="layer"')
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })
})

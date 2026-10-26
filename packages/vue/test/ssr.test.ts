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
})

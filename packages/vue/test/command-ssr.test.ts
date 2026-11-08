// @vitest-environment node
// GoopCommand server render with `ignoreFilter`: every item renders, no Empty (items register
// on mount, so the server can't count them), and no DOM access.
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

describe('GoopCommand SSR', () => {
  it('renders ignoreFilter commands with every item and no Empty', async () => {
    const { GoopCommand, GoopCommandEmpty, GoopCommandGroup, GoopCommandInput, GoopCommandItem, GoopCommandList } = await import('../src')
    const app = (ignoreFilter: boolean, labels: string[]) =>
      createSSRApp({
        render: () =>
          h(GoopCommand, { ignoreFilter }, () => [
            h(GoopCommandInput, { modelValue: 'sldr' }),
            h(GoopCommandList, null, () => [
              h(GoopCommandEmpty, null, () => 'Nothing found'),
              h(GoopCommandGroup, { heading: 'Components' }, () =>
                labels.map((v) => h(GoopCommandItem, { key: v, value: v }, () => v)),
              ),
            ]),
          ]),
      })
    const apps = [app(true, ['Slider', 'Select']), app(true, ['Slider', 'Select']), app(true, [])]
    trap('document')
    trap('window')
    try {
      const a = await renderToString(apps[0]!)
      const b = await renderToString(apps[1]!)
      expect(a).toBe(b)
      expect(a.match(/role="option"/g)).toHaveLength(2)
      expect(a).toContain('Slider')
      expect(a).not.toContain('Nothing found')
      expect(a).not.toMatch(/\shidden[\s=>]/)
      expect(a).not.toMatch(/ignore-?filter/i)
      // No items: Empty waits for mount on the client too, so the markup matches.
      const none = await renderToString(apps[2]!)
      expect(none).not.toContain('Nothing found')
    } finally {
      delete (globalThis as Record<string, unknown>).document
      delete (globalThis as Record<string, unknown>).window
    }
  })
})

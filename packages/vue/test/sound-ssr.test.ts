// @vitest-environment node
// Sound on the server: the cue attributes render (so hydration matches), but nothing loads
// Cuelume or touches Web Audio / the DOM.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const TRAPPED = ['document', 'window', 'AudioContext'] as const
const trap = (name: string) =>
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(`${name} accessed during SSR`)
    },
  })

describe('sound SSR', () => {
  it('renders cue attributes only when sound is on, without touching document/window/AudioContext', async () => {
    const { GoopButton, GoopInput, GoopPlugin, GoopSwitch } = await import('../src')
    const core = await import('@goopui/core')
    const view = () => [h(GoopButton, null, () => 'Save'), h(GoopSwitch), h(GoopInput)]
    const off = createSSRApp({ render: view })
    const on = createSSRApp({ render: view }).use(GoopPlugin, { sound: true })
    for (const name of TRAPPED) trap(name)
    try {
      const plain = await renderToString(off)
      const sounding = await renderToString(on)
      expect(plain).not.toContain('data-cuelume')
      expect(sounding).toContain('data-cuelume-tap')
      expect(sounding).toContain('data-cuelume-toggle')
      expect(sounding).toContain('data-cuelume-type')
      // Mount hooks never run on the server, so sound was never requested.
      expect(core.isSoundEnabled()).toBe(false)
    } finally {
      for (const name of TRAPPED) delete (globalThis as Record<string, unknown>)[name]
    }
  })
})

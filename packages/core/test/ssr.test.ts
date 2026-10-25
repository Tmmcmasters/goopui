// @vitest-environment node
import { describe, expect, it } from 'vitest'

describe('SSR safety', () => {
  it('imports the source with no document/window globals', async () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined')
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined')
    const mod = await import('../src/index')
    expect(typeof mod.attachGoop).toBe('function')
    expect(mod.gooFilterMarkup({ blur: 4, contrast: 20, threshold: 0.4 })).toContain('<filter')
  })

  it('imports the built dist with no document global', async () => {
    const path = '../dist/index.mjs'
    const mod = (await import(/* @vite-ignore */ path)) as { attachGoop?: unknown }
    expect(typeof mod.attachGoop).toBe('function')
  })
})

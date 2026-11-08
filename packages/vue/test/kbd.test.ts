import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { GoopKbd, GoopKbdGroup, KBD_PROP_KEYS, goopComponents, goopKbdProps, toKbdOptions } from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopKbd', () => {
  it('is in the manifest, every option is a prop', () => {
    expect(goopComponents).toContain('GoopKbd')
    expect(goopComponents).toContain('GoopKbdGroup')
    for (const k of KBD_PROP_KEYS) expect(goopKbdProps).toHaveProperty(k)
    expect(toKbdOptions({ goo: false })).toBeNull()
    expect(toKbdOptions({ press: false })).toBeNull()
    expect(toKbdOptions({ keys: ['Meta', 'K'], press: 2 }, { preset: 'wild' })).toMatchObject({ keys: ['Meta', 'K'], press: 2, preset: 'wild' })
  })

  it("renders shadcn's kbd; takes clicks only while the squish is on", async () => {
    const w = mount(GoopKbdGroup, { slots: { default: () => [h(GoopKbd, null, () => '⌘'), h(GoopKbd, { goo: false }, () => 'K')] } })
    expect(w.get('[data-slot="kbd-group"]').element.tagName).toBe('KBD')
    const [a, b] = w.findAll('[data-slot="kbd"]')
    expect(a!.classes()).toContain('pointer-events-auto')
    expect(a!.classes()).not.toContain('pointer-events-none')
    expect(b!.classes()).toContain('pointer-events-none')
    w.unmount()
  })

  it('squishes on its key combo', async () => {
    const w = mount(GoopKbd, { attachTo: document.body, props: { keys: ['Meta', 'K'] }, slots: { default: () => 'K' } })
    await nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(w.vm.handle?.pressed).toBe(true)
    expect(w.attributes('data-goop-pressed')).toBe('')
    w.unmount()
  })
})

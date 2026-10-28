import { SWITCH_DROP_CIRCLES, SWITCH_FILL_CIRCLES, SWITCH_THUMB_CIRCLES, activeTickerCount, isLoopRunning } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { GoopPlugin, GoopSwitch, toSwitchOptions } from '../src'

const layers = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="layer"]')
const sw = (w: { get: (s: string) => any }) => w.get('[role="switch"]') as import('@vue/test-utils').DOMWrapper<HTMLElement>
const blobs = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="blob"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopSwitch', () => {
  it('renders a reka switch with shadcn classes and two aria-hidden goo layers', async () => {
    const w = mount(GoopSwitch, { props: { class: 'w-12' }, attachTo: document.body })
    await nextTick()
    expect(sw(w).attributes('role')).toBe('switch')
    expect(sw(w).attributes('aria-checked')).toBe('false')
    expect(sw(w).attributes('data-slot')).toBe('switch')
    expect(sw(w).attributes('data-size')).toBe('default')
    expect(sw(w).classes()).toContain('w-12')
    expect(sw(w).attributes()).toHaveProperty('data-goop-active')
    // Goo fill active: the checked track stays muted, the primary color is goo.
    expect(sw(w).classes()).toContain('data-checked:bg-input')
    expect(sw(w).classes()).not.toContain('data-checked:bg-primary')
    const ls = layers(sw(w).element)
    expect(ls).toHaveLength(2)
    for (const l of ls) expect(l.getAttribute('aria-hidden')).toBe('true')
    expect(blobs(sw(w).element)).toHaveLength(SWITCH_FILL_CIRCLES + SWITCH_DROP_CIRCLES + SWITCH_THUMB_CIRCLES)
    expect(sw(w).find('[data-slot="switch-thumb"]').attributes('style')).toContain('background-color: transparent')
    w.unmount()
    expect(document.querySelector('[data-goop-defs]')).toBeNull()
  })

  it('v-model toggles aria-checked and animates on the shared loop', async () => {
    const model = ref(false)
    const w = mount(GoopSwitch, {
      props: { modelValue: model.value, 'onUpdate:modelValue': (v: boolean) => w.setProps({ modelValue: (model.value = v) }) },
      attachTo: document.body,
    })
    await nextTick()
    await sw(w).trigger('click')
    await nextTick()
    expect(model.value).toBe(true)
    expect(sw(w).attributes('aria-checked')).toBe('true')
    expect(sw(w).attributes('data-state')).toBe('checked')
    expect(w.vm.handle?.running).toBe(true)
    expect(isLoopRunning()).toBe(true)
    await w.setProps({ modelValue: false })
    expect(sw(w).attributes('aria-checked')).toBe('false')
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('uncontrolled: defaultValue, click toggles and emits', async () => {
    const w = mount(GoopSwitch, { props: { defaultValue: true }, attachTo: document.body })
    expect(sw(w).attributes('aria-checked')).toBe('true')
    await sw(w).trigger('click')
    expect(sw(w).attributes('aria-checked')).toBe('false')
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    w.unmount()
  })

  it('disabled does not toggle', async () => {
    const w = mount(GoopSwitch, { props: { disabled: true }, attachTo: document.body })
    await sw(w).trigger('click')
    expect(sw(w).attributes('aria-checked')).toBe('false')
    expect(sw(w).attributes()).toHaveProperty('data-disabled')
    w.unmount()
  })

  it('goo=false is a plain shadcn switch; fill=false keeps the primary track', async () => {
    const plain = mount(GoopSwitch, { props: { goo: false }, attachTo: document.body })
    await nextTick()
    expect(layers(sw(plain).element)).toHaveLength(0)
    expect(sw(plain).classes()).toContain('data-checked:bg-primary')
    plain.unmount()
    const noFill = mount(GoopSwitch, { props: { fill: false }, attachTo: document.body })
    await nextTick()
    expect(sw(noFill).classes()).toContain('data-checked:bg-primary')
    // Attached without fill, the real track color follows the shown state (switches at impact).
    expect(sw(noFill).classes()).toContain('data-[goop-switch-state=checked]:bg-primary!')
    noFill.unmount()
  })

  it('colors follow the shown state: aria flips on click, colors wait for the impact', async () => {
    const w = mount(GoopSwitch, { attachTo: document.body })
    await nextTick()
    expect(sw(w).attributes('data-goop-switch-state')).toBe('unchecked')
    expect(sw(w).classes()).toContain('dark:data-[goop-switch-state=checked]:[--goop-switch-thumb:var(--primary-foreground)]')
    expect(sw(w).classes()).not.toContain('dark:data-checked:[--goop-switch-thumb:var(--primary-foreground)]')
    await sw(w).trigger('click')
    await nextTick()
    expect(sw(w).attributes('aria-checked')).toBe('true')
    expect(sw(w).attributes('data-state')).toBe('checked')
    expect(sw(w).attributes('data-goop-switch-state')).toBe('unchecked')
    expect(w.vm.handle?.pose?.coverage).toBe(0)
    w.unmount()
  })

  it('wave prop maps to core', () => {
    expect(toSwitchOptions({ wave: false })).toMatchObject({ wave: false })
    expect(toSwitchOptions({ wave: 1.5 })).toMatchObject({ wave: 1.5 })
  })

  it('reduced motion: instant state change, nothing ticks', async () => {
    const w = mount(GoopSwitch, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await nextTick()
    await sw(w).trigger('click')
    await nextTick()
    expect(sw(w).attributes('aria-checked')).toBe('true')
    expect(w.vm.handle?.reducedMotion).toBe(true)
    expect(w.vm.handle?.pose?.position).toBe(1)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('effect props map to core options', () => {
    expect(toSwitchOptions({ bridge: false, squish: 2, splat: 1.5, droplets: false, speed: 1.5, preset: 'wild' })).toMatchObject({
      splat: 1.5,
      droplets: false,
      bridge: false,
      squish: 2,
      speed: 1.5,
      preset: 'wild',
    })
    expect(toSwitchOptions({})).not.toHaveProperty('stretch')
  })

  it('hydrates SSR markup without mismatch, then attaches', async () => {
    const App = { render: () => [h(GoopSwitch), h(GoopSwitch, { defaultValue: true, size: 'sm' })] }
    const html = await renderToString(createSSRApp(App))
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.append(root)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createSSRApp(App)
    app.mount(root)
    await flushPromises()
    const messages = [...warn.mock.calls, ...error.mock.calls].map((c) => String(c[0]))
    expect(messages.filter((m) => /hydration|mismatch/i.test(m))).toEqual([])
    warn.mockRestore()
    error.mockRestore()
    expect(root.querySelectorAll('[data-slot="switch"][data-goop-active]')).toHaveLength(2)
    app.unmount()
  })
})

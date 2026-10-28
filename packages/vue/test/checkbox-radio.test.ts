import { CHECKBOX_CIRCLES, RADIO_CIRCLES, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  GoopCheckbox,
  GoopPlugin,
  GoopRadioGroup,
  GoopRadioGroupItem,
  goopComponents,
  toCheckboxOptions,
  toRadioOptions,
} from '../src'

const layers = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="layer"]')
const blobs = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="blob"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

async function hydrates(App: object, check: (root: HTMLElement) => void): Promise<void> {
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
  check(root)
  app.unmount()
}

describe('GoopCheckbox', () => {
  const box = (w: { get: (s: string) => any }) => w.get('[role="checkbox"]')

  it('is in the manifest', () => {
    for (const n of ['GoopCheckbox', 'GoopRadioGroup', 'GoopRadioGroupItem']) expect(goopComponents).toContain(n)
  })

  it('renders a reka checkbox with shadcn classes and one aria-hidden goo layer', async () => {
    const w = mount(GoopCheckbox, { props: { class: 'size-6' }, attachTo: document.body })
    await nextTick()
    expect(box(w).attributes('data-slot')).toBe('checkbox')
    expect(box(w).attributes('aria-checked')).toBe('false')
    expect(box(w).classes()).toContain('size-6')
    expect(box(w).classes()).toContain('rounded-[4px]')
    expect(box(w).attributes()).toHaveProperty('data-goop-active')
    const ls = layers(box(w).element)
    expect(ls).toHaveLength(1)
    expect(ls[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(blobs(box(w).element)).toHaveLength(CHECKBOX_CIRCLES)
    w.unmount()
    expect(document.querySelector('[data-goop-defs]')).toBeNull()
  })

  it('v-model checks with a falling drop, the mark waiting until it lands', async () => {
    const model = ref<boolean | 'indeterminate'>(false)
    const w = mount(GoopCheckbox, {
      props: { modelValue: model.value, 'onUpdate:modelValue': (v: boolean | 'indeterminate') => w.setProps({ modelValue: (model.value = v) }) },
      attachTo: document.body,
    })
    await nextTick()
    await box(w).trigger('click')
    await nextTick()
    expect(model.value).toBe(true)
    expect(box(w).attributes('aria-checked')).toBe('true')
    expect(box(w).find('[data-slot="checkbox-indicator"]').attributes()).toHaveProperty('data-goop-mark')
    expect(box(w).attributes()).toHaveProperty('data-goop-pending')
    expect(w.vm.handle?.running).toBe(true)
    await w.setProps({ modelValue: 'indeterminate' })
    expect(box(w).attributes('aria-checked')).toBe('mixed')
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('uncontrolled defaultValue, emits, and disabled', async () => {
    const w = mount(GoopCheckbox, { props: { defaultValue: true }, attachTo: document.body })
    expect(box(w).attributes('aria-checked')).toBe('true')
    await box(w).trigger('click')
    expect(box(w).attributes('aria-checked')).toBe('false')
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    w.unmount()
    const d = mount(GoopCheckbox, { props: { disabled: true }, attachTo: document.body })
    await box(d).trigger('click')
    expect(box(d).attributes('aria-checked')).toBe('false')
    d.unmount()
  })

  it('goo=false is a plain shadcn checkbox', async () => {
    const w = mount(GoopCheckbox, { props: { goo: false, defaultValue: true }, attachTo: document.body })
    await nextTick()
    expect(layers(box(w).element)).toHaveLength(0)
    expect(box(w).classes()).toContain('data-checked:bg-primary')
    expect(box(w).find('[data-goop-mark]').exists()).toBe(false)
    w.unmount()
  })

  it('reduced motion: instant, nothing ticks, mark shows', async () => {
    const w = mount(GoopCheckbox, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await nextTick()
    await box(w).trigger('click')
    await nextTick()
    expect(w.vm.handle?.reducedMotion).toBe(true)
    expect(w.vm.handle?.pose?.fill).toBe(1)
    expect(box(w).attributes()).not.toHaveProperty('data-goop-pending')
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('effect props map to core options', () => {
    expect(toCheckboxOptions({ fill: false, splat: 2, droplets: false, speed: 1.5, preset: 'wild' })).toMatchObject({
      fill: false,
      splat: 2,
      droplets: false,
      speed: 1.5,
      preset: 'wild',
    })
    expect(toCheckboxOptions({})).not.toHaveProperty('splat')
  })

  it('hydrates SSR markup without mismatch, then attaches', async () => {
    const App = { render: () => [h(GoopCheckbox), h(GoopCheckbox, { defaultValue: true })] }
    await hydrates(App, (root) => expect(root.querySelectorAll('[data-slot="checkbox"][data-goop-active]')).toHaveLength(2))
  })
})

const Group = defineComponent({
  props: { modelValue: { type: String, default: undefined }, orientation: { type: String, default: undefined }, goo: { type: Boolean, default: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        GoopRadioGroup,
        {
          modelValue: props.modelValue,
          orientation: props.orientation as 'vertical' | 'horizontal' | undefined,
          goo: props.goo,
          'onUpdate:modelValue': (v: unknown) => emit('update:modelValue', v),
        },
        () => ['a', 'b', 'c'].map((v) => h(GoopRadioGroupItem, { value: v, id: v })),
      )
  },
})

describe('GoopRadioGroup', () => {
  const radios = (el: Element) => el.querySelectorAll<HTMLElement>('[role="radio"]')

  it('renders reka radios with shadcn classes and one goo layer on the root', async () => {
    const w = mount(Group, { props: { modelValue: 'a' }, attachTo: document.body })
    await nextTick()
    const root = w.get('[role="radiogroup"]')
    expect(root.attributes('data-slot')).toBe('radio-group')
    expect(root.classes()).toContain('grid')
    expect(root.attributes()).toHaveProperty('data-goop-active')
    expect(layers(root.element)).toHaveLength(1)
    expect(blobs(root.element)).toHaveLength(RADIO_CIRCLES)
    const items = radios(root.element)
    expect(items).toHaveLength(3)
    expect(items[0]!.getAttribute('data-slot')).toBe('radio-group-item')
    expect(items[0]!.getAttribute('aria-checked')).toBe('true')
    expect(items[0]!.className).toContain('data-checked:bg-transparent')
    expect(items[0]!.querySelector('[data-goop-mark]')).not.toBeNull()
    w.unmount()
  })

  it('v-model: click and keyboard selection make the blob jump', async () => {
    const model = ref('a')
    const w = mount(Group, {
      props: { modelValue: model.value, 'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: (model.value = v) }) },
      attachTo: document.body,
    })
    await nextTick()
    const root = w.get('[role="radiogroup"]')
    const group = w.findComponent(GoopRadioGroup)
    expect(group.vm.handle?.running).toBe(false)
    await w.findAll('[role="radio"]')[2]!.trigger('click')
    await nextTick()
    await nextTick()
    expect(model.value).toBe('c')
    expect(radios(root.element)[2]!.getAttribute('aria-checked')).toBe('true')
    expect(group.vm.handle?.running).toBe(true)
    expect(root.attributes()).toHaveProperty('data-goop-pending')
    // Programmatic (keyboard-style) change through v-model.
    await w.setProps({ modelValue: 'b' })
    await nextTick()
    expect(radios(root.element)[1]!.getAttribute('aria-checked')).toBe('true')
    expect(group.vm.handle?.running).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('goo=false is a plain shadcn radio group', async () => {
    const w = mount(Group, { props: { modelValue: 'a', goo: false }, attachTo: document.body })
    await nextTick()
    const root = w.get('[role="radiogroup"]')
    expect(layers(root.element)).toHaveLength(0)
    expect(radios(root.element)[0]!.className).not.toContain('data-checked:bg-transparent')
    w.unmount()
  })

  it('reduced motion: no ticker', async () => {
    const w = mount(Group, {
      props: { modelValue: 'a' },
      global: { plugins: [[GoopPlugin, { reducedMotion: true }]] },
      attachTo: document.body,
    })
    await nextTick()
    await w.setProps({ modelValue: 'c' })
    await nextTick()
    expect(w.findComponent(GoopRadioGroup).vm.handle?.reducedMotion).toBe(true)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('effect props map to core options', () => {
    expect(toRadioOptions({ bridge: false, splat: 1.5, droplets: 0, preset: 'subtle' })).toMatchObject({
      bridge: false,
      splat: 1.5,
      droplets: 0,
      preset: 'subtle',
    })
    expect(toRadioOptions({})).not.toHaveProperty('bridge')
  })

  it('hydrates SSR markup without mismatch, then attaches', async () => {
    const App = { render: () => h(Group, { modelValue: 'b', orientation: 'horizontal' }) }
    await hydrates(App, (root) => expect(root.querySelectorAll('[data-slot="radio-group"][data-goop-active]')).toHaveLength(1))
  })
})

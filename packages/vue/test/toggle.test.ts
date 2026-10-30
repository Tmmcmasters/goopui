import { activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import {
  GoopToggle,
  GoopToggleGroup,
  GoopToggleGroupItem,
  goopComponents,
  goopToggleGroupProps,
  goopToggleProps,
  toToggleGroupOptions,
  toToggleOptions,
} from '../src'

const layers = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="layer"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopToggle', () => {
  it('is in the manifest with its group', () => {
    for (const n of ['GoopToggle', 'GoopToggleGroup', 'GoopToggleGroupItem']) expect(goopComponents).toContain(n)
  })

  it('every effect is a prop', () => {
    for (const k of ['flood', 'wobble', 'droplets', 'speed', 'preset', 'renderer']) expect(goopToggleProps).toHaveProperty(k)
    for (const k of ['flow', 'merge']) expect(goopToggleGroupProps).toHaveProperty(k)
    expect(toToggleOptions({ flood: false, wobble: 0.5 })).toMatchObject({ flood: false, wobble: 0.5 })
    expect(toToggleGroupOptions({ merge: false }, { preset: 'wild' })).toMatchObject({ merge: false, preset: 'wild' })
  })

  it('renders a shadcn toggle with one aria-hidden goo layer and floods on press', async () => {
    const model = ref(false)
    const w = mount(GoopToggle, {
      props: { variant: 'outline' as const, size: 'sm' as const, modelValue: model.value, 'onUpdate:modelValue': (v: boolean) => w.setProps({ modelValue: (model.value = v) }) },
      slots: { default: () => 'B' },
      attachTo: document.body,
    })
    await nextTick()
    const btn = w.get('button')
    expect(btn.attributes('data-slot')).toBe('toggle')
    expect(btn.classes()).toContain('border-input')
    expect(btn.classes()).toContain('h-8')
    expect(btn.attributes()).toHaveProperty('data-goop-active')
    expect(btn.classes()).toContain('data-[state=on]:bg-transparent')
    expect(layers(btn.element)).toHaveLength(1)
    expect(layers(btn.element)[0]!.getAttribute('aria-hidden')).toBe('true')
    await btn.trigger('click')
    await flushPromises()
    expect(model.value).toBe(true)
    expect(btn.attributes('data-state')).toBe('on')
    expect(w.vm.handle?.running).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it(':goo="false" is a plain shadcn toggle', async () => {
    const w = mount(GoopToggle, { props: { goo: false, defaultValue: true }, attachTo: document.body })
    await nextTick()
    expect(layers(w.element)).toHaveLength(0)
    expect(w.get('button').classes()).not.toContain('data-[state=on]:bg-transparent')
    w.unmount()
  })
})

describe('GoopToggleGroup', () => {
  const Group = (type: 'single' | 'multiple', initial: string | string[]) =>
    defineComponent({
      setup() {
        const v = ref<string | string[]>(initial)
        return () =>
          h(
            GoopToggleGroup,
            { type, variant: 'outline', modelValue: v.value, 'onUpdate:modelValue': (x: unknown) => (v.value = x as string | string[]) },
            () => ['a', 'b', 'c'].map((x) => h(GoopToggleGroupItem, { value: x }, () => x.toUpperCase())),
          )
      },
    })

  it('shares variant with items, one goo layer on the root', async () => {
    const w = mount(Group('single', 'a'), { attachTo: document.body })
    await nextTick()
    const root = w.get('[data-slot="toggle-group"]')
    expect(layers(root.element)).toHaveLength(1)
    const items = w.findAll('[data-slot="toggle-group-item"]')
    expect(items).toHaveLength(3)
    expect(items[0]!.attributes('data-variant')).toBe('outline')
    expect(items[0]!.attributes('data-spacing')).toBe('0')
    expect(items[0]!.classes()).toContain('border-input')
    expect(items[0]!.attributes('data-state')).toBe('on')
    w.unmount()
  })

  it('single: selecting another item flows the goo there', async () => {
    const w = mount(Group('single', 'a'), { attachTo: document.body })
    await nextTick()
    const group = w.findComponent(GoopToggleGroup)
    await w.findAll('[data-slot="toggle-group-item"]')[2]!.trigger('click')
    await flushPromises()
    expect(w.findAll('[data-slot="toggle-group-item"]')[2]!.attributes('data-state')).toBe('on')
    expect(group.vm.handle?.running).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('multiple: pressing items floods them; reduced motion shows them still', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Group('multiple', ['a']), { attachTo: document.body })
    await nextTick()
    const group = w.findComponent(GoopToggleGroup)
    await w.findAll('[data-slot="toggle-group-item"]')[1]!.trigger('click')
    await flushPromises()
    expect(group.vm.handle?.pose?.levels).toEqual([1, 1, 0])
    expect(group.vm.handle?.running).toBe(false)
    w.unmount()
  })
})

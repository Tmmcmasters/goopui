import { PROGRESS_CIRCLES, SLIDER_FILL_SEGMENTS, activeTickerCount } from '@goopui/core'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { GoopProgress, GoopSlider } from '../src'

const blobs = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="blob"]')
const layer = (el: Element) => el.querySelector<HTMLElement>('[data-goop="layer"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopSlider', () => {
  it('renders shadcn parts: root, track, range, one thumb per value; class merges', async () => {
    const w = mount(GoopSlider, { props: { defaultValue: [20, 80], class: 'w-60 my-slider' }, attachTo: document.body })
    await nextTick()
    expect(w.attributes('data-slot')).toBe('slider')
    expect(w.classes()).toContain('my-slider')
    expect(w.classes()).toContain('touch-none')
    expect(w.find('[data-slot="slider-track"]').classes()).toContain('bg-muted')
    expect(w.find('[data-slot="slider-range"]').exists()).toBe(true)
    expect(w.findAll('[data-slot="slider-thumb"]')).toHaveLength(2)
    expect(w.findAll('[role="slider"]')).toHaveLength(2)
    w.unmount()
  })

  it('attaches one goo layer: fill + 2 blobs per thumb; real range/thumbs go see-through', async () => {
    const w = mount(GoopSlider, { props: { defaultValue: [20, 80] }, attachTo: document.body })
    await nextTick()
    await nextTick()
    expect(w.attributes()).toHaveProperty('data-goop-active')
    expect(layer(w.element)!.getAttribute('aria-hidden')).toBe('true')
    expect(blobs(w.element)).toHaveLength(SLIDER_FILL_SEGMENTS + 4)
    expect(w.find<HTMLElement>('[data-slot="slider-range"]').element.style.backgroundColor).toBe('transparent')
    expect(w.find<HTMLElement>('[data-slot="slider-thumb"]').element.style.borderColor).toBe('transparent')
    const el = w.element
    w.unmount()
    expect(layer(el)).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('goo=false is a plain shadcn Slider; toggling goo attaches / detaches', async () => {
    const w = mount(GoopSlider, { props: { defaultValue: [50], goo: false }, attachTo: document.body })
    await nextTick()
    expect(layer(w.element)).toBeNull()
    expect(w.attributes()).not.toHaveProperty('data-goop-host')
    expect(w.find<HTMLElement>('[data-slot="slider-thumb"]').attributes('style') ?? '').not.toContain('transparent')
    await w.setProps({ goo: true })
    await nextTick()
    expect(layer(w.element)).not.toBeNull()
    await w.setProps({ goo: false })
    await nextTick()
    expect(layer(w.element)).toBeNull()
    w.unmount()
  })

  it('v-model: keyboard steps the value and a parent ref follows; thumbs follow the array', async () => {
    const value = ref([50])
    const Parent = defineComponent({
      setup: () => () => h(GoopSlider, { modelValue: value.value, 'onUpdate:modelValue': (v?: number[]) => v && (value.value = v), slosh: false }),
    })
    const w = mount(Parent, { attachTo: document.body })
    await nextTick()
    const thumb = w.find('[role="slider"]')
    expect(thumb.attributes('aria-valuenow')).toBe('50')
    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(value.value).toEqual([51])
    await nextTick()
    expect(w.find('[role="slider"]').attributes('aria-valuenow')).toBe('51')
    value.value = [10, 90]
    await nextTick()
    await nextTick()
    expect(w.findAll('[role="slider"]')).toHaveLength(2)
    expect(blobs(w.element)).toHaveLength(SLIDER_FILL_SEGMENTS + 4)
    w.unmount()
  })

  it('orientation=vertical mirrors shadcn data attributes', () => {
    const w = mount(GoopSlider, { props: { defaultValue: [30], orientation: 'vertical' } })
    expect(w.attributes()).toHaveProperty('data-vertical')
    expect(w.find('[data-slot="slider-track"]').attributes()).toHaveProperty('data-vertical')
    expect(w.find('[role="slider"]').attributes('aria-orientation')).toBe('vertical')
    w.unmount()
  })
})

describe('GoopProgress', () => {
  it('is a shadcn Progress: progressbar role, aria values, indicator transform, class merges', () => {
    const w = mount(GoopProgress, { props: { modelValue: 40, class: 'h-3 w-60' } })
    expect(w.attributes('role')).toBe('progressbar')
    expect(w.attributes('aria-valuenow')).toBe('40')
    expect(w.attributes('data-slot')).toBe('progress')
    expect(w.classes()).toContain('h-3')
    expect(w.classes()).not.toContain('h-1')
    expect(w.find<HTMLElement>('[data-slot="progress-indicator"]').element.style.transform).toBe('translateX(-60%)')
    w.unmount()
  })

  it('attaches a liquid layer, opens the overflow for drips, cleans up on unmount', async () => {
    const w = mount(GoopProgress, { props: { modelValue: 40 }, attachTo: document.body })
    await nextTick()
    expect(w.attributes()).toHaveProperty('data-goop-active')
    expect(blobs(w.element)).toHaveLength(PROGRESS_CIRCLES)
    expect((w.element as HTMLElement).style.overflow).toBe('visible')
    expect(w.find<HTMLElement>('[data-slot="progress-indicator"]').element.style.backgroundColor).toBe('transparent')
    const el = w.element as HTMLElement
    w.unmount()
    expect(layer(el)).toBeNull()
    expect(el.style.overflow).toBe('')
    expect(activeTickerCount()).toBe(0)
  })

  it('v-model value changes reach the engine; null is indeterminate', async () => {
    const w = mount(GoopProgress, { props: { modelValue: 10, drips: false, slosh: false }, attachTo: document.body })
    await nextTick()
    const handle = (w.vm as unknown as { handle: { running: boolean } }).handle
    await w.setProps({ modelValue: 90 })
    await nextTick()
    expect(w.attributes('aria-valuenow')).toBe('90')
    expect(handle.running).toBe(true)
    await w.setProps({ modelValue: null })
    await nextTick()
    expect(w.attributes('data-state')).toBe('indeterminate')
    expect(handle.running).toBe(true)
    w.unmount()
  })

  it('goo=false renders plain shadcn; reduced motion is static', async () => {
    const plain = mount(GoopProgress, { props: { modelValue: 30, goo: false }, attachTo: document.body })
    await nextTick()
    expect(layer(plain.element)).toBeNull()
    plain.unmount()
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(GoopProgress, { props: { modelValue: 30 }, attachTo: document.body })
    await nextTick()
    expect(blobs(w.element)).toHaveLength(PROGRESS_CIRCLES)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })
})

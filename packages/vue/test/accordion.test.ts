import { ACCORDION_CIRCLES, ACCORDION_TIMING_VARS, ACCORDION_FEEL, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import {
  GoopAccordion,
  GoopAccordionContent,
  GoopAccordionItem,
  GoopAccordionTrigger,
  GoopCollapsible,
  GoopCollapsibleContent,
  GoopCollapsibleTrigger,
  goopComponents,
  toAccordionOptions,
} from '../src'

const Demo = defineComponent({
  props: {
    root: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const open = ref<string | undefined>(undefined)
    return () =>
      h(
        GoopAccordion,
        { type: 'single', collapsible: true, modelValue: open.value, 'onUpdate:modelValue': (v: unknown) => (open.value = v as string), ...props.root },
        () =>
          ['a', 'b', 'c'].map((v) =>
            h(GoopAccordionItem, { value: v }, () => [
              h(GoopAccordionTrigger, null, () => `Item ${v}`),
              h(GoopAccordionContent, null, () => `Body ${v}`),
            ]),
          ),
      )
  },
})

const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="accordion-item"]')]
const triggers = () => [...document.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]')]
const layer = (el: Element) => el.querySelector<HTMLElement>(':scope > [data-goop="layer"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopAccordion', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of [
      'GoopAccordion',
      'GoopAccordionItem',
      'GoopAccordionTrigger',
      'GoopAccordionContent',
      'GoopCollapsible',
      'GoopCollapsibleTrigger',
      'GoopCollapsibleContent',
    ])
      expect(goopComponents).toContain(name)
  })

  it('renders shadcn parts with an aria-hidden goo layer per item and a chevron source', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(items()).toHaveLength(3)
    for (const item of items()) {
      expect(item.hasAttribute('data-goop-accordion')).toBe(true)
      expect(item.className).toContain('border-b')
      const l = layer(item)!
      expect(l.getAttribute('aria-hidden')).toBe('true')
      expect(l.querySelectorAll('[data-goop="blob"]')).toHaveLength(ACCORDION_CIRCLES)
      expect(item.querySelector('[data-goop-accordion-source]')).not.toBeNull()
    }
    // shadcn's layout exactly: no extra padding with goo on.
    expect(triggers()[0]!.className).not.toContain('px-3')
    expect(triggers()[0]!.className).toContain('py-4')
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('opening animates; switching items hands the goo over and delays the opening item', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    triggers()[0]!.click()
    await flushPromises()
    expect(items()[0]!.getAttribute('data-state')).toBe('open')
    expect(activeTickerCount()).toBeGreaterThan(0)
    expect(Number.parseFloat(items()[0]!.style.getPropertyValue(ACCORDION_TIMING_VARS.delay))).toBe(0)
    triggers()[2]!.click()
    await flushPromises()
    expect(items()[2]!.getAttribute('data-state')).toBe('open')
    expect(Number.parseFloat(items()[2]!.style.getPropertyValue(ACCORDION_TIMING_VARS.delay))).toBeCloseTo(
      ACCORDION_FEEL.playful.handoff,
      2,
    )
    w.unmount()
  })

  it('collapsing a controlled single accordion (model -> undefined) sucks the goo back up', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    triggers()[0]!.click()
    await flushPromises()
    const item = w.findAllComponents(GoopAccordionItem)[0]!.vm as unknown as { handle: { pose: { rect: unknown } | null; update(o: object): void } }
    triggers()[0]!.click()
    await flushPromises()
    expect(items()[0]!.getAttribute('data-state')).toBe('closed')
    // Jump the close to its end: no goo left.
    item.handle.update({ reducedMotion: true })
    expect(item.handle.pose?.rect).toBeNull()
    w.unmount()
  })

  it('handoff off: no delay; goo off: plain shadcn', async () => {
    const w = mount(Demo, { props: { root: { handoff: false } }, attachTo: document.body })
    await flushPromises()
    triggers()[0]!.click()
    await flushPromises()
    triggers()[1]!.click()
    await flushPromises()
    expect(Number.parseFloat(items()[1]!.style.getPropertyValue(ACCORDION_TIMING_VARS.delay))).toBe(0)
    w.unmount()
    const off = mount(Demo, { props: { root: { goo: false } }, attachTo: document.body })
    await flushPromises()
    for (const item of items()) {
      expect(layer(item)).toBeNull()
      expect(item.hasAttribute('data-goop-accordion')).toBe(false)
    }
    expect(triggers()[0]!.className).not.toContain('px-3')
    expect(document.querySelector('[data-slot="accordion-content"]')?.className ?? 'animate-accordion').toContain('animate-accordion')
    off.unmount()
  })

  it('maps props to core options', () => {
    expect(toAccordionOptions({ goo: false })).toBeNull()
    expect(toAccordionOptions({ splash: false, splashAmount: 2, jelly: 2, speed: 1.5 }, { preset: 'wild' })).toMatchObject({
      splash: false,
      splashAmount: 2,
      jelly: 2,
      speed: 1.5,
      preset: 'wild',
    })
  })
})

describe('GoopCollapsible', () => {
  const C = defineComponent({
    setup() {
      const open = ref(false)
      return () =>
        h(GoopCollapsible, { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v), class: 'w-80' }, () => [
          h(GoopCollapsibleTrigger, null, () => 'Toggle'),
          h(GoopCollapsibleContent, null, () => 'Hidden stuff'),
        ])
    },
  })

  it('attaches goo to the root, the trigger is the source, toggling animates', async () => {
    const w = mount(C, { attachTo: document.body })
    await flushPromises()
    const root = document.querySelector<HTMLElement>('[data-slot="collapsible"]')!
    expect(root.className).toContain('w-80')
    expect(root.hasAttribute('data-goop-accordion')).toBe(true)
    expect(layer(root)).not.toBeNull()
    const trigger = document.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')!
    expect(trigger.hasAttribute('data-goop-accordion-source')).toBe(true)
    trigger.click()
    await flushPromises()
    expect(root.getAttribute('data-state')).toBe('open')
    expect(document.querySelector('[data-slot="collapsible-content"]')!.hasAttribute('data-goop-accordion-content')).toBe(true)
    expect(activeTickerCount()).toBeGreaterThan(0)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })
})

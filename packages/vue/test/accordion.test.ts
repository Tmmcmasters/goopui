import { ACCORDION_FLOODED_ATTR, ACCORDION_STILL_ATTR, ACCORDION_TIMING_VARS, activeTickerCount, type AccordionHandle } from '@goopui/core'
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
const handles = (w: ReturnType<typeof mount>) =>
  w.findAllComponents(GoopAccordionItem).map((c) => (c.vm as unknown as { handle: AccordionHandle }).handle)

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

  it('renders shadcn parts with an aria-hidden goo layer in each trigger; idle at rest', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(items()).toHaveLength(3)
    for (const item of items()) {
      expect(item.hasAttribute('data-goop-accordion')).toBe(true)
      expect(item.className).toContain('border-b')
      expect(layer(item)).toBeNull()
      const t = item.querySelector<HTMLElement>('[data-slot="accordion-trigger"]')!
      expect(t.hasAttribute('data-goop-accordion-trigger')).toBe(true)
      expect(layer(t)!.getAttribute('aria-hidden')).toBe('true')
      expect(item.style.getPropertyValue(ACCORDION_TIMING_VARS.openEase)).toMatch(/^linear\(/)
    }
    // shadcn's layout exactly.
    expect(triggers()[0]!.className).toContain('py-4')
    expect(triggers()[0]!.className).not.toContain('px-')
    expect(activeTickerCount()).toBe(0)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('opening floods the row; switching drains the old row while the new one floods', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    triggers()[0]!.click()
    await flushPromises()
    expect(items()[0]!.getAttribute('data-state')).toBe('open')
    expect(activeTickerCount()).toBeGreaterThan(0)
    const [a, , c] = handles(w)
    expect(a!.running).toBe(true)
    triggers()[2]!.click()
    await flushPromises()
    expect(items()[0]!.getAttribute('data-state')).toBe('closed')
    expect(items()[2]!.getAttribute('data-state')).toBe('open')
    expect(a!.running).toBe(true)
    expect(c!.running).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: the open row is a static flooded fill, no ticker', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    triggers()[1]!.click()
    await flushPromises()
    expect(items()[1]!.hasAttribute(ACCORDION_STILL_ATTR)).toBe(true)
    expect(triggers()[1]!.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(true)
    expect(triggers()[0]!.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(false)
    expect(activeTickerCount()).toBe(0)
    triggers()[1]!.click()
    await flushPromises()
    expect(triggers()[1]!.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(false)
    w.unmount()
  })

  it('goo off: plain shadcn', async () => {
    const off = mount(Demo, { props: { root: { goo: false } }, attachTo: document.body })
    await flushPromises()
    for (const item of items()) {
      expect(item.hasAttribute('data-goop-accordion')).toBe(false)
      expect(item.querySelector('[data-goop="layer"]')).toBeNull()
    }
    expect(triggers()[0]!.hasAttribute('data-goop-accordion-trigger')).toBe(false)
    triggers()[0]!.click()
    await flushPromises()
    expect(document.querySelector('[data-slot="accordion-content"]')!.className).toContain('animate-accordion')
    off.unmount()
  })

  it('maps props to core options', () => {
    expect(toAccordionOptions({ goo: false })).toBeNull()
    expect(toAccordionOptions({ droplets: false, wobble: 2, jelly: 0.5, flood: true, speed: 1.5 }, { preset: 'wild' })).toMatchObject({
      droplets: false,
      wobble: 2,
      jelly: 0.5,
      flood: true,
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

  it('floods the trigger on open, the content springs, cleans up', async () => {
    const w = mount(C, { attachTo: document.body })
    await flushPromises()
    const root = document.querySelector<HTMLElement>('[data-slot="collapsible"]')!
    expect(root.className).toContain('w-80')
    expect(root.hasAttribute('data-goop-accordion')).toBe(true)
    const trigger = document.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')!
    expect(trigger.hasAttribute('data-goop-accordion-trigger')).toBe(true)
    expect(layer(trigger)).not.toBeNull()
    trigger.click()
    await flushPromises()
    expect(root.getAttribute('data-state')).toBe('open')
    expect(document.querySelector('[data-slot="collapsible-content"]')!.hasAttribute('data-goop-accordion-content')).toBe(true)
    expect(activeTickerCount()).toBeGreaterThan(0)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })
})

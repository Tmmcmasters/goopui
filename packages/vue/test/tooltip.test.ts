import { EMERGE_CIRCLES, EMERGE_MOMENTUM_CIRCLES, TOOLTIP_BLOOM_SPLASH, TOOLTIP_FEEL, activeTickerCount, emergeBloomDuration, isLoopRunning } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
import {
  GoopPlugin,
  GoopTooltip,
  GoopTooltipContent,
  GoopTooltipProvider,
  GoopTooltipTrigger,
  goopComponents,
  toTooltipOptions,
} from '../src'

const Demo = defineComponent({
  props: {
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    return () =>
      h(GoopTooltipProvider, null, () =>
        h(GoopTooltip, { open: props.open }, () => [
          h(GoopTooltipTrigger, null, () => 'Hover'),
          h(GoopTooltipContent, props.content, () => 'Add to library'),
        ]),
      )
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="tooltip-content"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopTooltip', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of ['GoopTooltip', 'GoopTooltipProvider', 'GoopTooltipTrigger', 'GoopTooltipContent']) expect(goopComponents).toContain(name)
  })

  it('renders real content over an aria-hidden goo surface, emerging from the trigger', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el).not.toBeNull()
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(surface.querySelectorAll('[data-goop="blob"]')).toHaveLength(EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES)
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    expect(el.textContent).toContain('Add to library')
    // The label is an element child, so it fades with the content (and the arrow).
    expect(el.querySelector(':scope > [data-goop="label"]')!.textContent).toBe('Add to library')
    expect(document.querySelector('[role="tooltip"]')!.textContent).toContain('Add to library')
    expect(isLoopRunning()).toBe(true)
    // Tooltip timing: the bloom close at tooltip speed (quicker than the popover).
    expect(el.style.getPropertyValue('--goop-emerge-close')).toBe(`${Math.round(emergeBloomDuration(TOOLTIP_FEEL.playful, 'close') * 1000)}ms`)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('moves the background onto the goo; class passthrough merges', async () => {
    const w = mount(Demo, { props: { content: { class: 'max-w-48' } }, attachTo: document.body })
    await flushPromises()
    const cls = content()!.className.split(' ')
    expect(cls).toContain('max-w-48')
    expect(cls).not.toContain('max-w-xs')
    expect(cls).toContain('[--goop-color:var(--foreground)]')
    for (const c of ['bg-foreground', 'data-[state=instant-open]:animate-in']) expect(cls).not.toContain(c)
    w.unmount()
  })

  it(':goo="false" is exactly shadcn TooltipContent', async () => {
    const w = mount(Demo, { props: { content: { goo: false } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-foreground', 'text-background', 'data-[state=instant-open]:animate-in']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    w.unmount()
  })

  it('reduced motion: opens at rest, nothing ticks', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('maps props to core options: bloom + single with a light splash by default', () => {
    expect(toTooltipOptions({})).toMatchObject({
      feel: TOOLTIP_FEEL,
      flow: true,
      flowStyle: 'bloom',
      bloomStart: 'single',
      openSlosh: 0.4,
      closeSlosh: 0.5,
      ...TOOLTIP_BLOOM_SPLASH,
    })
    expect(toTooltipOptions({ bloomStart: 'merge', openDrips: false, openDripAmount: 2 })).toMatchObject({ bloomStart: 'merge', openDrips: false, openDripAmount: 2 })
    // The original bulb emerge: no drips by default, no light splash knobs.
    const bulb = toTooltipOptions({ flow: false })
    expect(bulb).toMatchObject({ flow: false, openDrips: false, bridge: true })
    expect(bulb.openDripAmount).toBeUndefined()
    expect(toTooltipOptions({ flowStyle: 'neck' })).toMatchObject({ flow: true, flowStyle: 'neck', openDrips: false })
    expect(toTooltipOptions({ openDrips: true, openSlosh: false, closeSlosh: 1.5 })).toMatchObject({
      openDrips: true,
      openSlosh: false,
      closeSlosh: 1.5,
    })
  })
})

import { EMERGE_CIRCLES, EMERGE_MOMENTUM_CIRCLES, activeTickerCount, isLoopRunning } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type PropType } from 'vue'
import {
  GoopPlugin,
  GoopPopover,
  GoopPopoverAnchor,
  GoopPopoverContent,
  GoopPopoverDescription,
  GoopPopoverHeader,
  GoopPopoverTitle,
  GoopPopoverTrigger,
  goopComponents,
} from '../src'

const Demo = defineComponent({
  props: {
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    anchor: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref(props.open)
    return () =>
      h(
        GoopPopover,
        { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) },
        () => [
          props.anchor ? h(GoopPopoverAnchor, null, () => h('div', { id: 'anchor' }, 'anchor')) : null,
          h(GoopPopoverTrigger, null, () => 'Open'),
          h(GoopPopoverContent, { side: 'right', ...props.content }, () =>
            h(GoopPopoverHeader, null, () => [
              h(GoopPopoverTitle, null, () => 'Dimensions'),
              h(GoopPopoverDescription, null, () => 'Set the dimensions.'),
            ]),
          ),
        ],
      )
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopPopover', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of ['GoopPopover', 'GoopPopoverTrigger', 'GoopPopoverContent', 'GoopPopoverAnchor', 'GoopPopoverHeader', 'GoopPopoverTitle', 'GoopPopoverDescription']) {
      expect(goopComponents).toContain(name)
    }
  })

  it('renders shadcn parts with real content over an aria-hidden goo surface', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el).not.toBeNull()
    expect(el.getAttribute('role')).toBe('dialog')
    expect(el.querySelector('[data-slot="popover-title"]')!.textContent).toBe('Dimensions')
    expect(el.querySelector('[data-slot="popover-description"]')!.tagName).toBe('P')
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(surface.querySelector('[data-goop="layer"]')).not.toBeNull()
    expect(surface.querySelectorAll('[data-goop="blob"]')).toHaveLength(EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES)
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    expect(el.textContent).toBe('DimensionsSet the dimensions.')
    expect(isLoopRunning()).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('moves the background, ring and shadow onto the goo; class passthrough merges', async () => {
    const w = mount(Demo, { props: { content: { class: 'w-56' } }, attachTo: document.body })
    await flushPromises()
    const cls = content()!.className
    expect(cls).toContain('w-56')
    expect(cls).not.toContain('w-72')
    expect(cls).toContain('[--goop-color:var(--popover)]')
    for (const c of ['bg-popover', 'ring-1', 'shadow-md', 'data-open:animate-in']) expect(cls.split(' ')).not.toContain(c)
    w.unmount()
  })

  it(':goo="false" is exactly shadcn PopoverContent', async () => {
    const w = mount(Demo, { props: { content: { goo: false } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-popover', 'ring-1', 'shadow-md']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    w.unmount()
  })

  it('reduced motion: opens at rest, nothing ticks, closes with no hold', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(el.style.getPropertyValue('--goop-emerge-content')).toBe('1')
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    expect(content()!.getAttribute('data-goop-emerge')).toBe('open')
    w.unmount()
  })

  it('opens from the trigger and plays the close when the root closes', async () => {
    const w = mount(Demo, { props: { open: false }, attachTo: document.body })
    await flushPromises()
    expect(content()).toBeNull()
    await w.find('[data-slot="popover-trigger"]').trigger('click')
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('opening')
    expect(el.style.getPropertyValue('--goop-emerge-content')).toBe('0')
    // Record the states the host passes through (without goop.css, reka's Presence sees no
    // hold animation here and unmounts right after).
    const seen: string[] = []
    let hold = 0
    const mo = new MutationObserver(() => {
      const s = el.getAttribute('data-goop-emerge')
      if (s && seen.at(-1) !== s) seen.push(s)
      if (s === 'closing') hold = Number.parseFloat(el.style.getPropertyValue('--goop-emerge-close'))
    })
    mo.observe(el, { attributes: true, attributeFilter: ['data-goop-emerge', 'style'] })
    await w.find('[data-slot="popover-trigger"]').trigger('click')
    await flushPromises()
    mo.disconnect()
    expect(seen).toContain('closing')
    expect(hold).toBeGreaterThan(0)
    w.unmount()
    expect(isLoopRunning()).toBe(false)
  })

  it('toggling goo at runtime attaches and detaches the surface', async () => {
    const Toggle = defineComponent({
      setup() {
        const goo = ref(true)
        return { goo }
      },
      render() {
        return h(Demo, { content: { goo: this.goo } })
      },
    })
    const w = mount(Toggle, { attachTo: document.body })
    await flushPromises()
    expect(content()!.querySelector('[data-goop="surface"]')).not.toBeNull()
    ;(w.vm as unknown as { goo: boolean }).goo = false
    await flushPromises()
    expect(content()!.querySelector('[data-goop="surface"]')).toBeNull()
    expect(content()!.hasAttribute('data-goop-emerge')).toBe(false)
    ;(w.vm as unknown as { goo: boolean }).goo = true
    await flushPromises()
    expect(content()!.querySelector('[data-goop="layer"]')).not.toBeNull()
    w.unmount()
  })

  it('renders a custom anchor', async () => {
    const w = mount(Demo, { props: { anchor: true }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-slot="popover-anchor"]')).not.toBeNull()
    expect(content()!.hasAttribute('data-goop-emerge')).toBe(true)
    w.unmount()
  })
})

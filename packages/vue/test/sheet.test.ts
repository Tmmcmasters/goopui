import { SHEET_CIRCLES, activeTickerCount, isLoopRunning } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import {
  GoopPlugin,
  GoopSheet,
  GoopSheetClose,
  GoopSheetContent,
  GoopSheetDescription,
  GoopSheetFooter,
  GoopSheetHeader,
  GoopSheetTitle,
  GoopSheetTrigger,
  SHEET_PROP_KEYS,
  goopComponents,
  toSheetOptions,
} from '../src'

const Demo = defineComponent({
  props: {
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const open = ref(props.open)
    return () =>
      h(GoopSheet, { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) }, () => [
        h(GoopSheetTrigger, null, () => 'Open'),
        h(GoopSheetContent, { renderer: 'svg', ...props.content }, () => [
          h(GoopSheetHeader, null, () => [
            h(GoopSheetTitle, null, () => 'Edit profile'),
            h(GoopSheetDescription, null, () => 'Make changes here.'),
          ]),
          h(GoopSheetFooter, null, () => h(GoopSheetClose, null, () => 'Done')),
        ]),
      ])
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopSheet', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of ['GoopSheet', 'GoopSheetTrigger', 'GoopSheetContent', 'GoopSheetHeader', 'GoopSheetFooter', 'GoopSheetTitle', 'GoopSheetDescription', 'GoopSheetClose']) {
      expect(goopComponents).toContain(name)
    }
  })

  it('renders a dialog with real content over an aria-hidden goo surface', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('role')).toBe('dialog')
    expect(el.getAttribute('data-side')).toBe('right')
    expect(el.querySelector('[data-slot="sheet-title"]')!.textContent).toBe('Edit profile')
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(surface.querySelectorAll('[data-goop="blob"]')).toHaveLength(SHEET_CIRCLES)
    expect(el.hasAttribute('data-goop-sheet')).toBe(true)
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull()
    expect(el.querySelector('[data-slot="sheet-close"] .sr-only')!.textContent).toBe('Close')
    expect(isLoopRunning()).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('moves background and border onto the goo; side and class passthrough', async () => {
    const w = mount(Demo, { props: { content: { side: 'top', class: 'gap-2' } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    const cls = el.className.split(' ')
    expect(el.getAttribute('data-side')).toBe('top')
    expect(cls).toEqual(expect.arrayContaining(['top-0', 'inset-x-0', 'gap-2', '[--goop-color:var(--background)]']))
    for (const c of ['bg-background', 'border-b', 'shadow-lg', 'gap-4']) expect(cls).not.toContain(c)
    w.unmount()
  })

  it(':goo="false" is exactly shadcn SheetContent', async () => {
    const w = mount(Demo, { props: { content: { goo: false, side: 'left' } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-background', 'border-r', 'shadow-lg', 'data-[state=open]:slide-in-from-left']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.hasAttribute('data-goop-sheet')).toBe(false)
    w.unmount()
  })

  it('reduced motion: opens at rest and nothing ticks', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-sheet')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(el.style.getPropertyValue('--goop-sheet-content')).toBe('1')
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    expect(content()!.getAttribute('data-goop-sheet')).toBe('open')
    w.unmount()
  })

  it('opens from the trigger and plays the close when the root closes', async () => {
    const w = mount(Demo, { props: { open: false }, attachTo: document.body })
    await flushPromises()
    expect(content()).toBeNull()
    await w.find('[data-slot="sheet-trigger"]').trigger('click')
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-sheet')).toBe('opening')
    expect(el.style.getPropertyValue('--goop-sheet-content')).toBe('0')
    const seen: string[] = []
    const mo = new MutationObserver(() => {
      const s = el.getAttribute('data-goop-sheet')
      if (s && seen.at(-1) !== s) seen.push(s)
    })
    mo.observe(el, { attributes: true, attributeFilter: ['data-goop-sheet'] })
    await w.find('[data-slot="sheet-trigger"]').trigger('click')
    await flushPromises()
    mo.disconnect()
    // Closed right after opening: nothing was out yet, so it closes at once.
    expect(seen.some((s) => s === 'closing' || s === 'closed')).toBe(true)
    w.unmount()
    expect(isLoopRunning()).toBe(false)
  })

  it('toggling goo at runtime attaches and detaches the surface', async () => {
    const Toggle = defineComponent({
      setup() {
        return { goo: ref(true) }
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
    expect(content()!.hasAttribute('data-goop-sheet')).toBe(false)
    w.unmount()
  })
})

describe('toSheetOptions', () => {
  it('every effect defaults on; false turns it off; canvas unless told otherwise', () => {
    const o = toSheetOptions({})
    expect(o).toMatchObject({ lobes: true, slosh: true, drips: true, suck: true, fade: true, renderer: 'canvas', speed: 1 })
    expect(toSheetOptions({ drips: false, suck: false })).toMatchObject({ drips: false, suck: false, lobes: true })
    expect(toSheetOptions({}, { renderer: 'svg' }).renderer).toBe('svg')
    expect(toSheetOptions({ renderer: 'svg' }, { renderer: 'canvas', preset: 'wild' })).toMatchObject({ renderer: 'svg', preset: 'wild' })
    expect(SHEET_PROP_KEYS).toEqual(expect.arrayContaining(['goo', 'lobes', 'slosh', 'drips', 'suck', 'fade', 'speed', 'preset', 'renderer']))
  })
})

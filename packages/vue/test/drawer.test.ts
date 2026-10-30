import { DRAWER_EFFECTS, DRAWER_GOO_ATTR } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type PropType } from 'vue'
import {
  DRAWER_PROP_KEYS,
  GoopDrawer,
  GoopDrawerClose,
  GoopDrawerContent,
  GoopDrawerDescription,
  GoopDrawerFooter,
  GoopDrawerHeader,
  GoopDrawerTitle,
  GoopDrawerTrigger,
  goopComponents,
  toDrawerOptions,
} from '../src'

const Demo = defineComponent({
  props: {
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props, { expose }) {
    const open = ref(props.open)
    expose({ open })
    return () =>
      h(
        GoopDrawer,
        { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) },
        () => [
          h(GoopDrawerTrigger, null, () => 'Open'),
          h(GoopDrawerContent, { renderer: 'svg', ...props.content }, () => [
            h(GoopDrawerHeader, null, () => [
              h(GoopDrawerTitle, null, () => 'Move goal'),
              h(GoopDrawerDescription, null, () => 'Set your daily activity goal.'),
            ]),
            h(GoopDrawerFooter, null, () => h(GoopDrawerClose, null, () => 'Cancel')),
          ]),
        ],
      )
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="drawer-content"]')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GoopDrawer', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of [
      'GoopDrawer',
      'GoopDrawerTrigger',
      'GoopDrawerContent',
      'GoopDrawerHeader',
      'GoopDrawerFooter',
      'GoopDrawerTitle',
      'GoopDrawerDescription',
      'GoopDrawerClose',
      'GoopDrawerOverlay',
    ]) {
      expect(goopComponents).toContain(name)
    }
  })

  it('every core drawer effect is a prop', () => {
    for (const k of DRAWER_EFFECTS) expect(DRAWER_PROP_KEYS).toContain(k)
    const o = toDrawerOptions({ lag: false, drips: 0.5, speed: 2 }, { preset: 'wild' })
    expect(o).toMatchObject({ lag: false, drips: 0.5, speed: 2, preset: 'wild', renderer: 'canvas' })
    expect('slosh' in o).toBe(false)
  })

  it('renders shadcn parts over an aria-hidden goo surface with a goo handle', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el).not.toBeNull()
    expect(el.hasAttribute('data-vaul-drawer')).toBe(true)
    expect(el.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
    const surface = el.querySelector('[data-goop="surface"]')!
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(el.className).not.toContain('bg-background')
    const grip = el.querySelector<HTMLElement>('[data-goop-drawer-handle]')!
    expect(grip.className).toContain('--goop-color:var(--muted)')
    expect(grip.querySelector('[data-goop="layer"]')).not.toBeNull()
    expect(el.textContent).toContain('Move goal')
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeNull()
    w.unmount()
  })

  it(':goo="false" is plain shadcn: background, border, solid handle, no goo', async () => {
    const w = mount(Demo, { attachTo: document.body, props: { content: { goo: false } } })
    await flushPromises()
    const el = content()!
    expect(el.className).toContain('bg-background')
    expect(el.hasAttribute(DRAWER_GOO_ATTR)).toBe(false)
    expect(el.querySelector('[data-goop="surface"]')).toBeNull()
    expect(el.querySelector('[data-goop-drawer-handle]')!.className).toContain('bg-muted')
    w.unmount()
  })

  it(':handle="false" keeps a plain handle but the goo panel', async () => {
    const w = mount(Demo, { attachTo: document.body, props: { content: { handle: false } } })
    await flushPromises()
    const el = content()!
    const grip = el.querySelector<HTMLElement>('[data-goop-drawer-handle]')!
    expect(grip.className).toContain('bg-muted')
    expect(grip.querySelector('[data-goop="layer"]')).toBeNull()
    expect(el.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
    w.unmount()
  })

  it('toggling goo live attaches and detaches', async () => {
    const goo = ref(true)
    const W = defineComponent({
      setup: () => () => h(Demo, { content: { goo: goo.value } }),
    })
    const w = mount(W, { attachTo: document.body })
    await flushPromises()
    expect(content()!.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
    goo.value = false
    await nextTick()
    await flushPromises()
    expect(content()!.hasAttribute(DRAWER_GOO_ATTR)).toBe(false)
    w.unmount()
  })
})

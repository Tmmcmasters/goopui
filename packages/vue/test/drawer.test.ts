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
    root: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: ['update:open', 'update:activeSnapPoint', 'close', 'animationEnd'],
  setup(props, { expose, emit }) {
    const open = ref(props.open)
    expose({ open })
    return () =>
      h(
        GoopDrawer,
        {
          ...props.root,
          open: open.value,
          'onUpdate:open': (v: boolean) => {
            open.value = v
            emit('update:open', v)
          },
          'onUpdate:activeSnapPoint': (v: number | string) => emit('update:activeSnapPoint', v),
          onClose: () => emit('close'),
          onAnimationEnd: (v: boolean) => emit('animationEnd', v),
        },
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
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const until = async (fn: () => boolean, ms = 4000) => {
  const t0 = Date.now()
  while (!fn() && Date.now() - t0 < ms) await wait(20)
  return fn()
}
const escape = () => {
  const el = content()!
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GoopDrawer', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of [
      'GoopDrawer',
      'GoopDrawerTrigger',
      'GoopDrawerPortal',
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
    const o = toDrawerOptions({ lag: false, splash: 0.5, speed: 2, goo: false }, { preset: 'wild' })
    expect(o).toMatchObject({ lag: false, splash: 0.5, speed: 2, goo: false, preset: 'wild', renderer: 'canvas' })
    expect('slosh' in o).toBe(false)
  })

  it('a11y: a labelled modal dialog with vaul data attributes, goo surface aria-hidden', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el).not.toBeNull()
    expect(el.getAttribute('role')).toBe('dialog')
    expect(el.getAttribute('data-state')).toBe('open')
    expect(el.getAttribute('data-vaul-drawer-direction')).toBe('bottom')
    const title = document.querySelector('[data-slot="drawer-title"]')!
    const desc = document.querySelector('[data-slot="drawer-description"]')!
    expect(el.getAttribute('aria-labelledby')).toBe(title.id)
    expect(el.getAttribute('aria-describedby')).toBe(desc.id)
    expect(el.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
    expect(el.querySelector('[data-goop="surface"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(el.className).not.toContain('bg-background')
    const grip = el.querySelector<HTMLElement>('[data-goop-drawer-handle]')!
    expect(grip.getAttribute('aria-hidden')).toBe('true')
    expect(grip.className).toContain('--goop-color:var(--muted)')
    expect(grip.querySelector('[data-goop="layer"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeNull()
    w.unmount()
  })

  it('v-model:open: Escape closes through the engine, then unmounts and emits close / animationEnd', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(await until(() => w.emitted('animationEnd')?.some((e) => e[0] === true) ?? false)).toBe(true)
    escape()
    await flushPromises()
    expect(w.emitted('update:open')?.at(-1)).toEqual([false])
    expect(w.emitted('close')).toHaveLength(1)
    // Still mounted while it animates out, as a closed dialog.
    expect(content()?.getAttribute('data-state')).toBe('closed')
    expect(await until(() => content() === null)).toBe(true)
    expect(w.emitted('animationEnd')?.at(-1)).toEqual([false])
    expect(document.querySelector('[data-slot="drawer-overlay"]')).toBeNull()
    w.unmount()
  })

  it('opening from the trigger mounts the panel', async () => {
    const w = mount(Demo, { attachTo: document.body, props: { open: false } })
    await flushPromises()
    expect(content()).toBeNull()
    document.querySelector<HTMLElement>('[data-slot="drawer-trigger"]')!.click()
    await flushPromises()
    expect(w.emitted('update:open')?.at(-1)).toEqual([true])
    expect(content()).not.toBeNull()
    w.unmount()
  })

  it('dismissible: false ignores Escape, but the Close button still closes', async () => {
    const w = mount(Demo, { attachTo: document.body, props: { root: { dismissible: false } } })
    await flushPromises()
    escape()
    await flushPromises()
    expect(w.emitted('update:open')).toBeUndefined()
    expect(content()).not.toBeNull()
    document.querySelector<HTMLElement>('[data-slot="drawer-close"]')!.click()
    await flushPromises()
    expect(w.emitted('update:open')?.at(-1)).toEqual([false])
    w.unmount()
  })

  it('snap points: rests on the active point, follows v-model:activeSnapPoint, resets to the first on close', async () => {
    const snap = ref<number | string>(0.5)
    const open = ref(true)
    const W = defineComponent({
      setup: () => () =>
        h(
          GoopDrawer,
          {
            open: open.value,
            'onUpdate:open': (v: boolean) => (open.value = v),
            snapPoints: [0.25, 0.5, 1],
            activeSnapPoint: snap.value,
            'onUpdate:activeSnapPoint': (v: number | string) => (snap.value = v),
          },
          () => h(GoopDrawerContent, { renderer: 'svg' }, () => h(GoopDrawerTitle, null, () => 'Snap')),
        ),
    })
    const w = mount(W, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-vaul-snap-points')).toBe('true')
    Object.defineProperty(el, 'offsetHeight', { value: window.innerHeight, configurable: true })
    const ty = () => Number(/translate3d\([^,]+, ([-\d.]+)px/.exec(el.style.transform)?.[1] ?? Number.NaN)
    expect(await until(() => Math.abs(ty() - window.innerHeight * 0.5) < 1)).toBe(true)
    snap.value = 1
    await flushPromises()
    expect(await until(() => Math.abs(ty()) < 1)).toBe(true)
    open.value = false
    await flushPromises()
    expect(await until(() => content() === null)).toBe(true)
    expect(snap.value).toBe(0.25)
    w.unmount()
  })

  it('direction is passed to the panel (shadcn direction classes key off it)', async () => {
    const w = mount(Demo, { attachTo: document.body, props: { root: { direction: 'left' } } })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-vaul-drawer-direction')).toBe('left')
    expect(el.className).toContain('data-[vaul-drawer-direction=left]:left-0')
    expect(el.style.transform).toMatch(/translate3d\(-?[\d.]+px, 0px, 0\)/)
    w.unmount()
  })

  it('shouldScaleBackground scales [data-vaul-drawer-wrapper] while open and restores it after', async () => {
    const wrap = document.createElement('div')
    wrap.setAttribute('data-vaul-drawer-wrapper', '')
    document.body.append(wrap)
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    Object.defineProperty(content()!, 'offsetHeight', { value: 300, configurable: true })
    expect(await until(() => wrap.style.transform.startsWith('scale(0.9'))).toBe(true)
    expect(document.body.style.background).toContain('black')
    escape()
    await flushPromises()
    expect(await until(() => content() === null)).toBe(true)
    expect(wrap.style.transform).toBe('')
    expect(document.body.style.background).toBe('')
    w.unmount()
  })

  it(':goo="false" is plain shadcn: background, border, solid handle, no goo surface', async () => {
    const w = mount(Demo, { attachTo: document.body, props: { content: { goo: false } } })
    await flushPromises()
    const el = content()!
    expect(el.className).toContain('bg-background')
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
    expect(el.querySelector('[data-goop="surface"]')).not.toBeNull()
    w.unmount()
  })

  it('toggling goo live attaches and detaches the surface', async () => {
    const goo = ref(true)
    const W = defineComponent({
      setup: () => () => h(Demo, { content: { goo: goo.value } }),
    })
    const w = mount(W, { attachTo: document.body })
    await flushPromises()
    expect(content()!.querySelector('[data-goop="surface"]')).not.toBeNull()
    goo.value = false
    await nextTick()
    await flushPromises()
    expect(content()!.querySelector('[data-goop="surface"]')).toBeNull()
    expect(content()!.className).toContain('bg-background')
    w.unmount()
  })
})

import { MENU_FEEL, activeTickerCount, type EmergeOptions, type EmergePoint } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type PropType, nextTick } from 'vue'

// Pass-through spy on attachEmerge, so tests can read the options each panel attached with.
const attached = vi.hoisted(() => [] as { host: HTMLElement; opts: EmergeOptions }[])
vi.mock('@goopui/core', async (orig) => {
  const core = await orig<typeof import('@goopui/core')>()
  return {
    ...core,
    attachEmerge: (host: HTMLElement, opts: EmergeOptions) => {
      attached.push({ host, opts })
      return core.attachEmerge(host, opts)
    },
  }
})

import {
  GoopContextMenu,
  GoopContextMenuCheckboxItem,
  GoopContextMenuContent,
  GoopContextMenuGroup,
  GoopContextMenuItem,
  GoopContextMenuLabel,
  GoopContextMenuPortal,
  GoopContextMenuRadioGroup,
  GoopContextMenuRadioItem,
  GoopContextMenuSeparator,
  GoopContextMenuShortcut,
  GoopContextMenuSub,
  GoopContextMenuSubContent,
  GoopContextMenuSubTrigger,
  GoopContextMenuTrigger,
  GoopPlugin,
  goopComponents,
  resolveContextMenuProps,
  toContextMenuOptions,
} from '../src'

const PARTS = [
  'GoopContextMenu',
  'GoopContextMenuTrigger',
  'GoopContextMenuContent',
  'GoopContextMenuGroup',
  'GoopContextMenuLabel',
  'GoopContextMenuItem',
  'GoopContextMenuCheckboxItem',
  'GoopContextMenuRadioGroup',
  'GoopContextMenuRadioItem',
  'GoopContextMenuSeparator',
  'GoopContextMenuShortcut',
  'GoopContextMenuSub',
  'GoopContextMenuSubTrigger',
  'GoopContextMenuSubContent',
  'GoopContextMenuPortal',
]

const Demo = defineComponent({
  props: {
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    sub: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    subOpen: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref(false)
    const checked = ref(false)
    const position = ref('top')
    return { open, checked, position, props }
  },
  render() {
    const p = this.props
    return h(GoopContextMenu, { 'onUpdate:open': (v: boolean) => (this.open = v) }, () => [
      h(GoopContextMenuTrigger, { id: 'area', style: 'display:block;width:300px;height:200px' }, () => 'Right-click here'),
      h(GoopContextMenuContent, { ...p.content }, () => [
        h(GoopContextMenuLabel, null, () => 'Actions'),
        h(GoopContextMenuGroup, null, () => [
          h(GoopContextMenuItem, { id: 'back' }, () => ['Back', h(GoopContextMenuShortcut, null, () => '⌘[')]),
          h(GoopContextMenuItem, { id: 'delete', variant: 'destructive', inset: true }, () => 'Delete'),
        ]),
        h(GoopContextMenuSeparator),
        h(GoopContextMenuCheckboxItem, { id: 'check', modelValue: this.checked, 'onUpdate:modelValue': (v: boolean) => (this.checked = v) }, () => 'Bookmarks'),
        h(GoopContextMenuRadioGroup, { modelValue: this.position, 'onUpdate:modelValue': (v: unknown) => (this.position = String(v)) }, () => [
          h(GoopContextMenuRadioItem, { value: 'top' }, () => 'Top'),
          h(GoopContextMenuRadioItem, { value: 'bottom' }, () => 'Bottom'),
        ]),
        h(GoopContextMenuSub, { open: p.subOpen }, () => [
          h(GoopContextMenuSubTrigger, { id: 'more' }, () => 'More tools'),
          h(GoopContextMenuPortal, null, () =>
            h(GoopContextMenuSubContent, { ...p.sub }, () => h(GoopContextMenuItem, { id: 'nested' }, () => 'Save page')),
          ),
        ]),
      ]),
    ])
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="context-menu-content"]')
const subContent = () => document.querySelector<HTMLElement>('[data-slot="context-menu-sub-content"]')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POP = Math.round(MENU_FEEL.playful.pop * 1000)
const origin = (host: HTMLElement | null) => {
  const o = [...attached].reverse().find((a) => a.host === host)?.opts.bloomOrigin
  return typeof o === 'function' ? o() : o
}

/** Right-click the trigger area at (x, y). */
const rightClick = async (x: number, y: number) => {
  document.querySelector('#area')!.dispatchEvent(new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true, cancelable: true }))
  await flushPromises()
  await wait(0)
  await flushPromises()
}

afterEach(() => {
  document.body.innerHTML = ''
  attached.length = 0
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopContextMenu', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of PARTS) expect(goopComponents).toContain(name)
  })

  it('opens on right-click: shadcn parts over an aria-hidden emerge surface, goo highlight in the list', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(content()).toBeNull()
    await rightClick(40, 50)
    const el = content()!
    expect(el.getAttribute('role')).toBe('menu')
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    const list = el.querySelector<HTMLElement>('[data-slot="context-menu-list"]')!
    expect(list.firstElementChild!.getAttribute('data-goop')).toBe('highlight')
    expect(list.className.split(' ')).toEqual(expect.arrayContaining(['overflow-clip', 'p-1']))
    expect(el.querySelector('#delete')!.getAttribute('data-variant')).toBe('destructive')
    expect(el.querySelector('#delete')!.hasAttribute('data-inset')).toBe(true)
    expect(el.querySelector('[data-slot="context-menu-shortcut"]')!.textContent).toBe('⌘[')
    expect(el.querySelector('[data-slot="context-menu-label"]')!.textContent).toBe('Actions')
    expect(el.querySelector('[role="menuitemcheckbox"]')).not.toBeNull()
    expect(el.querySelectorAll('[role="menuitemradio"]')).toHaveLength(2)
    expect(el.querySelector('[data-slot="context-menu-sub-trigger"]')!.getAttribute('aria-haspopup')).toBe('menu')
    for (const item of el.querySelectorAll('[role^="menuitem"]')) expect(item.className.split(' ')).not.toContain('focus:bg-accent')
    for (const c of ['bg-popover', 'ring-1', 'shadow-md']) expect(el.className.split(' ')).not.toContain(c)
    expect((w.vm as unknown as { open: boolean }).open).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('blooms detached from the right-click point, a new point each time', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    const opts = [...attached].reverse().find((a) => a.host === content())!.opts
    expect(opts.detached).toBe(true)
    expect(origin(content())).toEqual({ x: 40, y: 50 } satisfies EmergePoint)
    // Close, then open somewhere else.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    await wait(0)
    await rightClick(210, 140)
    expect(origin(content())).toEqual({ x: 210, y: 140 })
    w.unmount()
  })

  it('bloomFrom="center" blooms from the panel center (no origin)', async () => {
    const w = mount(Demo, { props: { content: { bloomFrom: 'center' } }, attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    expect(origin(content())).toBeNull()
    w.unmount()
  })

  it('submenus bloom out of their parent item', async () => {
    const w = mount(Demo, { props: { subOpen: true }, attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    const el = subContent()!
    expect(el).not.toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    expect(el.querySelector('[data-slot="context-menu-list"] > [data-goop="highlight"]')).not.toBeNull()
    const sub = [...attached].reverse().find((a) => a.host === el)!.opts
    expect(sub.detached).toBeFalsy()
    expect(origin(el)).toBe(document.querySelector('[data-slot="context-menu-sub-trigger"]'))
    expect(w.findComponent(GoopContextMenuSubContent).vm.handle).not.toBeNull()
    w.unmount()
  })

  it(':submenus="false" renders plain shadcn submenus', async () => {
    const w = mount(Demo, { props: { subOpen: true, content: { submenus: false } }, attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    const el = subContent()!
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.className.split(' ')).toContain('bg-popover')
    w.unmount()
  })

  it(':goo="false" is exactly shadcn', async () => {
    const w = mount(Demo, { props: { content: { goo: false } }, attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-popover', 'ring-1', 'shadow-md', 'p-1']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    expect(el.querySelector('#back')!.className.split(' ')).toContain('focus:bg-accent')
    w.unmount()
  })

  it(':highlight="false" keeps the goo panel but the flat highlight', async () => {
    const w = mount(Demo, { props: { content: { highlight: false } }, attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    const el = content()!
    expect(el.querySelector('[data-goop="surface"]')).not.toBeNull()
    expect(el.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(el.querySelector('#back')!.className.split(' ')).toContain('focus:bg-accent')
    w.unmount()
  })

  it('select pops the blob, then closes once the pop has played', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    content()!.querySelector<HTMLElement>('#back')!.click()
    // Microtasks only: a flushPromises macrotask could let the pop's close timer fire first.
    await nextTick()
    await nextTick()
    expect((w.vm as unknown as { open: boolean }).open).toBe(true)
    await vi.waitFor(() => expect((w.vm as unknown as { open: boolean }).open).toBe(false), { timeout: 5000, interval: 10 })
    w.unmount()
  })

  it('reduced motion: opens at rest, nothing ticks, select closes at once', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(activeTickerCount()).toBe(0)
    el.querySelector<HTMLElement>('#back')!.click()
    await flushPromises()
    expect((w.vm as unknown as { open: boolean }).open).toBe(false)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    await rightClick(40, 50)
    expect(content()!.getAttribute('data-goop-emerge')).toBe('open')
    w.unmount()
  })
})

describe('context menu props', () => {
  it('resolve to on, popover surface, pointer origin, always bloom; submenus inherit', () => {
    const root = resolveContextMenuProps({ wobble: false })
    expect(root).toMatchObject({ goo: true, highlight: true, pop: true, submenus: true, wobble: false, surface: 'popover', bloomFrom: 'pointer', flow: true, flowStyle: 'bloom' })
    const sub = resolveContextMenuProps({ pop: false }, { ...root, bloomFrom: 'center', surface: '#abc' })
    expect(sub).toMatchObject({ wobble: false, pop: false, bloomFrom: 'center', surface: '#abc' })
    const { emerge, highlight } = toContextMenuOptions(sub, { preset: 'subtle' })
    expect(emerge).toMatchObject({ flow: true, flowStyle: 'bloom', wobble: false, surfaceColor: '#abc', preset: 'subtle' })
    expect(highlight).toMatchObject({ pop: false, wobble: false })
    expect(toContextMenuOptions(resolveContextMenuProps({ highlight: false })).highlight).toBeNull()
    expect(toContextMenuOptions(resolveContextMenuProps({ openDrips: false, openSlosh: false })).emerge).toMatchObject({ openDrips: false, openSlosh: false })
  })
})

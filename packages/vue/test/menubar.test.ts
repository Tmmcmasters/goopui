import { MENU_FEEL, MENUBAR_FEEL, activeTickerCount, type EmergeOptions } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'

// Pass-through spy on attachEmerge, so tests can read the options each menu attached with.
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
  GoopMenubar,
  GoopMenubarCheckboxItem,
  GoopMenubarContent,
  GoopMenubarGroup,
  GoopMenubarItem,
  GoopMenubarLabel,
  GoopMenubarMenu,
  GoopMenubarPortal,
  GoopMenubarRadioGroup,
  GoopMenubarRadioItem,
  GoopMenubarSeparator,
  GoopMenubarShortcut,
  GoopMenubarSub,
  GoopMenubarSubContent,
  GoopMenubarSubTrigger,
  GoopMenubarTrigger,
  GoopPlugin,
  goopComponents,
  resolveMenubarMenuProps,
  toMenubarMenuOptions,
  toMenubarOptions,
} from '../src'

const PARTS = [
  'GoopMenubar',
  'GoopMenubarMenu',
  'GoopMenubarTrigger',
  'GoopMenubarContent',
  'GoopMenubarGroup',
  'GoopMenubarLabel',
  'GoopMenubarItem',
  'GoopMenubarCheckboxItem',
  'GoopMenubarRadioGroup',
  'GoopMenubarRadioItem',
  'GoopMenubarSeparator',
  'GoopMenubarShortcut',
  'GoopMenubarSub',
  'GoopMenubarSubTrigger',
  'GoopMenubarSubContent',
  'GoopMenubarPortal',
]

const Demo = defineComponent({
  props: {
    bar: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    sub: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    subOpen: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref('')
    const checked = ref(false)
    const person = ref('a')
    return { open, checked, person, props }
  },
  render() {
    const p = this.props
    return h(GoopMenubar, { ...p.bar, modelValue: this.open, 'onUpdate:modelValue': (v: unknown) => (this.open = String(v)) }, () => [
      h(GoopMenubarMenu, { value: 'file' }, () => [
        h(GoopMenubarTrigger, { id: 'file' }, () => 'File'),
        h(GoopMenubarContent, { ...p.content }, () => [
          h(GoopMenubarLabel, null, () => 'Actions'),
          h(GoopMenubarGroup, null, () => [
            h(GoopMenubarItem, { id: 'new' }, () => ['New Tab', h(GoopMenubarShortcut, null, () => '⌘T')]),
            h(GoopMenubarItem, { id: 'delete', variant: 'destructive', inset: true }, () => 'Delete'),
          ]),
          h(GoopMenubarSeparator),
          h(GoopMenubarCheckboxItem, { id: 'check', modelValue: this.checked, 'onUpdate:modelValue': (v: boolean) => (this.checked = v) }, () => 'Bookmarks'),
          h(GoopMenubarRadioGroup, { modelValue: this.person, 'onUpdate:modelValue': (v: unknown) => (this.person = String(v)) }, () => [
            h(GoopMenubarRadioItem, { value: 'a' }, () => 'Andy'),
            h(GoopMenubarRadioItem, { value: 'b' }, () => 'Benoit'),
          ]),
          h(GoopMenubarSub, { open: p.subOpen }, () => [
            h(GoopMenubarSubTrigger, { id: 'share' }, () => 'Share'),
            h(GoopMenubarSubContent, { ...p.sub }, () => h(GoopMenubarItem, { id: 'nested' }, () => 'Email link')),
          ]),
        ]),
      ]),
      h(GoopMenubarMenu, { value: 'edit' }, () => [
        h(GoopMenubarTrigger, { id: 'edit' }, () => 'Edit'),
        h(GoopMenubarPortal, null, () => null),
        h(GoopMenubarContent, { ...p.content }, () => h(GoopMenubarItem, { id: 'undo' }, () => 'Undo')),
      ]),
      h(GoopMenubarMenu, { value: 'view' }, () => [
        h(GoopMenubarTrigger, { id: 'view', disabled: true }, () => 'View'),
        h(GoopMenubarContent, null, () => h(GoopMenubarItem, null, () => 'Zoom')),
      ]),
    ])
  },
})

const bar = () => document.querySelector<HTMLElement>('[data-slot="menubar"]')!
const trigger = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!
const content = () => document.querySelector<HTMLElement>('[data-slot="menubar-content"]')
const subContent = () => document.querySelector<HTMLElement>('[data-slot="menubar-sub-content"]')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POP = Math.round(MENU_FEEL.playful.pop * 1000)
const settle = async () => {
  await flushPromises()
  await wait(0)
  await flushPromises()
}
const openMenu = async (w: { vm: unknown }, value: string) => {
  ;(w.vm as { open: string }).open = value
  await settle()
}
const hover = async (el: Element) => {
  el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
  await settle()
}

afterEach(() => {
  document.body.innerHTML = ''
  attached.length = 0
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopMenubar', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of PARTS) expect(goopComponents).toContain(name)
  })

  it('renders shadcn markup with one aria-hidden goo body behind the triggers', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await settle()
    const el = bar()
    expect(el.getAttribute('role')).toBe('menubar')
    expect(el.hasAttribute('data-goop-menubar')).toBe(true)
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['h-8', 'rounded-lg', 'border', 'flex']))
    const highlights = el.querySelectorAll(':scope > [data-goop="highlight"]')
    expect(highlights).toHaveLength(1)
    expect(highlights[0]!.getAttribute('aria-hidden')).toBe('true')
    for (const t of el.querySelectorAll('[data-slot="menubar-trigger"]')) {
      expect(t.className.split(' ')).not.toContain('hover:bg-muted')
      expect(t.getAttribute('aria-haspopup')).toBe('menu')
    }
    expect(w.findComponent(GoopMenubar).vm.handle).not.toBeNull()
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('the body lights the hovered trigger, follows it across the bar, and skips disabled ones', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await settle()
    const handle = w.findComponent(GoopMenubar).vm.handle!
    expect(handle.target).toBeNull()
    await hover(trigger('file'))
    expect(handle.target).toBe(trigger('file'))
    await hover(trigger('edit'))
    expect(handle.target).toBe(trigger('edit'))
    expect(trigger('file').hasAttribute('data-goop-lit')).toBe(false)
    await hover(trigger('view'))
    expect(handle.target).toBe(trigger('edit'))
    bar().dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    await settle()
    expect(handle.target).toBeNull()
    // Touch never lights a trigger by hover (the open menu does).
    trigger('file').dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))
    await settle()
    expect(handle.target).toBeNull()
    w.unmount()
  })

  it('sits on the open trigger, and moves with the open menu', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await settle()
    const handle = w.findComponent(GoopMenubar).vm.handle!
    await openMenu(w, 'file')
    expect(trigger('file').getAttribute('data-state')).toBe('open')
    expect(handle.target).toBe(trigger('file'))
    await openMenu(w, 'edit')
    expect(handle.target).toBe(trigger('edit'))
    w.unmount()
  })

  it('menus bloom open: shadcn parts over an aria-hidden emerge surface, goo item highlight', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await settle()
    await openMenu(w, 'file')
    const el = content()!
    expect(el.getAttribute('role')).toBe('menu')
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    const list = el.querySelector<HTMLElement>('[data-slot="menubar-list"]')!
    expect(list.firstElementChild!.getAttribute('data-goop')).toBe('highlight')
    expect(list.className.split(' ')).toEqual(expect.arrayContaining(['overflow-clip', 'p-1']))
    expect(el.querySelector('#delete')!.getAttribute('data-variant')).toBe('destructive')
    expect(el.querySelector('#delete')!.hasAttribute('data-inset')).toBe(true)
    expect(el.querySelector('[data-slot="menubar-shortcut"]')!.textContent).toBe('⌘T')
    expect(el.querySelector('[data-slot="menubar-label"]')!.textContent).toBe('Actions')
    expect(el.querySelector('[role="menuitemcheckbox"]')).not.toBeNull()
    expect(el.querySelectorAll('[role="menuitemradio"]')).toHaveLength(2)
    for (const item of el.querySelectorAll('[role^="menuitem"]')) expect(item.className.split(' ')).not.toContain('focus:bg-accent')
    for (const c of ['bg-popover', 'ring-1', 'shadow-md']) expect(el.className.split(' ')).not.toContain(c)
    const opts = [...attached].reverse().find((a) => a.host === el)!.opts
    expect(opts).toMatchObject({ flow: true, flowStyle: 'bloom', surfaceColor: 'popover' })
    expect((opts.anchor as () => Element)()).toBe(trigger('file'))
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('menus inherit the bar settings unless they set their own', async () => {
    const w = mount(Demo, { props: { bar: { preset: 'wild', wobble: false, speed: 0.5 } }, attachTo: document.body })
    await settle()
    await openMenu(w, 'file')
    const opts = [...attached].reverse().find((a) => a.host === content())!.opts
    expect(opts).toMatchObject({ preset: 'wild', wobble: false, speed: 0.5 })
    w.unmount()
  })

  it('submenus bloom out of their row with their own highlight', async () => {
    const w = mount(Demo, { props: { subOpen: true }, attachTo: document.body })
    await settle()
    await openMenu(w, 'file')
    const el = subContent()!
    expect(el).not.toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    expect(el.querySelector('[data-slot="menubar-list"] > [data-goop="highlight"]')).not.toBeNull()
    expect(w.findComponent(GoopMenubarSubContent).vm.handle).not.toBeNull()
    w.unmount()
  })

  it(':submenus="false" renders plain shadcn submenus', async () => {
    const w = mount(Demo, { props: { subOpen: true, content: { submenus: false } }, attachTo: document.body })
    await settle()
    await openMenu(w, 'file')
    const el = subContent()!
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.className.split(' ')).toContain('bg-popover')
    w.unmount()
  })

  it(':goo="false" on the bar is exactly shadcn, menus too', async () => {
    const w = mount(Demo, { props: { bar: { goo: false } }, attachTo: document.body })
    await settle()
    expect(bar().hasAttribute('data-goop-menubar')).toBe(false)
    expect(bar().querySelector('[data-goop]')).toBeNull()
    expect(trigger('file').className.split(' ')).toEqual(expect.arrayContaining(['hover:bg-muted', 'aria-expanded:bg-muted']))
    await openMenu(w, 'file')
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-popover', 'ring-1', 'shadow-md', 'p-1']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    expect(el.querySelector('#new')!.className.split(' ')).toContain('focus:bg-accent')
    w.unmount()
  })

  it(':highlight="false" on the bar keeps the goo menus but shadcn triggers', async () => {
    const w = mount(Demo, { props: { bar: { highlight: false } }, attachTo: document.body })
    await settle()
    expect(bar().querySelector('[data-goop="highlight"]')).toBeNull()
    expect(trigger('file').className.split(' ')).toContain('hover:bg-muted')
    await openMenu(w, 'file')
    expect(content()!.hasAttribute('data-goop-emerge')).toBe(true)
    w.unmount()
  })

  it('select pops the item blob, then closes once the pop has played', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await settle()
    await openMenu(w, 'file')
    content()!.querySelector<HTMLElement>('#new')!.click()
    await flushPromises()
    expect((w.vm as unknown as { open: string }).open).toBe('file')
    await wait(POP + 30)
    expect((w.vm as unknown as { open: string }).open).toBe('')
    w.unmount()
  })

  it('reduced motion: menus open at rest, nothing ticks, select closes at once', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await settle()
    expect(w.findComponent(GoopMenubar).vm.handle!.reducedMotion).toBe(true)
    await hover(trigger('file'))
    await openMenu(w, 'file')
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(activeTickerCount()).toBe(0)
    el.querySelector<HTMLElement>('#new')!.click()
    await flushPromises()
    expect((w.vm as unknown as { open: string }).open).toBe('')
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await settle()
    expect(w.findComponent(GoopMenubar).vm.handle!.reducedMotion).toBe(true)
    await openMenu(w, 'file')
    expect(content()!.getAttribute('data-goop-emerge')).toBe('open')
    w.unmount()
  })
})

describe('menubar props', () => {
  it('bar: the tabs feel, toggles default on, off gives null', () => {
    expect(toMenubarOptions({})).toMatchObject({ feel: MENUBAR_FEEL, wobble: true, momentum: true, speed: 1 })
    expect(toMenubarOptions({ momentum: false }, { preset: 'subtle' })).toMatchObject({ momentum: false, preset: 'subtle' })
    expect(toMenubarOptions({ goo: false })).toBeNull()
    expect(toMenubarOptions({ highlight: false })).toBeNull()
  })

  it('menus: popover surface, bloom, inherit the bar, submenus inherit their parent', () => {
    const root = resolveMenubarMenuProps({}, null, { preset: 'wild', momentum: false, goo: true })
    expect(root).toMatchObject({ goo: true, highlight: true, pop: true, submenus: true, momentum: false, surface: 'popover', flowStyle: 'bloom', preset: 'wild' })
    expect(resolveMenubarMenuProps({}, null, { goo: false }).goo).toBe(false)
    expect(resolveMenubarMenuProps({ goo: true }, null, { goo: false }).goo).toBe(true)
    const sub = resolveMenubarMenuProps({ pop: false }, { ...root, surface: '#abc' }, { preset: 'subtle' })
    expect(sub).toMatchObject({ pop: false, surface: '#abc', preset: 'wild' })
    const { emerge, highlight } = toMenubarMenuOptions(sub)
    expect(emerge).toMatchObject({ surfaceColor: '#abc', preset: 'wild' })
    expect(highlight).toMatchObject({ pop: false, momentum: false })
    expect(toMenubarMenuOptions(resolveMenubarMenuProps({ highlight: false })).highlight).toBeNull()
  })
})

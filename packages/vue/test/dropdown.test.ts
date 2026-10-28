import { MENU_FEEL, MENU_HIGHLIGHT_CIRCLES, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import {
  GoopPlugin,
  GoopDropdownMenu,
  GoopDropdownMenuCheckboxItem,
  GoopDropdownMenuContent,
  GoopDropdownMenuGroup,
  GoopDropdownMenuItem,
  GoopDropdownMenuLabel,
  GoopDropdownMenuPortal,
  GoopDropdownMenuRadioGroup,
  GoopDropdownMenuRadioItem,
  GoopDropdownMenuSeparator,
  GoopDropdownMenuShortcut,
  GoopDropdownMenuSub,
  GoopDropdownMenuSubContent,
  GoopDropdownMenuSubTrigger,
  GoopDropdownMenuTrigger,
  goopComponents,
  resolveMenuProps,
  toMenuOptions,
} from '../src'

const PARTS = [
  'GoopDropdownMenu',
  'GoopDropdownMenuTrigger',
  'GoopDropdownMenuContent',
  'GoopDropdownMenuGroup',
  'GoopDropdownMenuLabel',
  'GoopDropdownMenuItem',
  'GoopDropdownMenuCheckboxItem',
  'GoopDropdownMenuRadioGroup',
  'GoopDropdownMenuRadioItem',
  'GoopDropdownMenuSeparator',
  'GoopDropdownMenuShortcut',
  'GoopDropdownMenuSub',
  'GoopDropdownMenuSubTrigger',
  'GoopDropdownMenuSubContent',
  'GoopDropdownMenuPortal',
]

const Demo = defineComponent({
  props: {
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    sub: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    subOpen: { type: Boolean, default: false },
    onPick: { type: Function as PropType<(e: Event) => void>, default: undefined },
  },
  setup(props) {
    const open = ref(true)
    const checked = ref(false)
    const position = ref('top')
    return { open, checked, position, props }
  },
  render() {
    const p = this.props
    return h(
      GoopDropdownMenu,
      { open: this.open, 'onUpdate:open': (v: boolean) => (this.open = v) },
      () => [
        h(GoopDropdownMenuTrigger, null, () => 'Open'),
        h(GoopDropdownMenuContent, { ...p.content }, () => [
          h(GoopDropdownMenuLabel, null, () => 'My account'),
          h(GoopDropdownMenuGroup, null, () => [
            h(GoopDropdownMenuItem, { id: 'profile', onSelect: p.onPick }, () => [
              'Profile',
              h(GoopDropdownMenuShortcut, null, () => '⇧⌘P'),
            ]),
            h(GoopDropdownMenuItem, { id: 'logout', variant: 'destructive', inset: true }, () => 'Log out'),
          ]),
          h(GoopDropdownMenuSeparator),
          h(GoopDropdownMenuCheckboxItem, { id: 'check', modelValue: this.checked, 'onUpdate:modelValue': (v: boolean) => (this.checked = v) }, () => 'Status bar'),
          h(GoopDropdownMenuRadioGroup, { modelValue: this.position, 'onUpdate:modelValue': (v: unknown) => (this.position = String(v)) }, () => [
            h(GoopDropdownMenuRadioItem, { value: 'top' }, () => 'Top'),
            h(GoopDropdownMenuRadioItem, { value: 'bottom' }, () => 'Bottom'),
          ]),
          h(GoopDropdownMenuSub, { open: p.subOpen }, () => [
            h(GoopDropdownMenuSubTrigger, null, () => 'More'),
            h(GoopDropdownMenuPortal, null, () =>
              h(GoopDropdownMenuSubContent, { ...p.sub }, () => h(GoopDropdownMenuItem, { id: 'nested' }, () => 'Nested')),
            ),
          ]),
        ]),
      ],
    )
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')
const subContent = () => document.querySelector<HTMLElement>('[data-slot="dropdown-menu-sub-content"]')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POP = Math.round(MENU_FEEL.playful.pop * 1000)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopDropdownMenu', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of PARTS) expect(goopComponents).toContain(name)
  })

  it('renders shadcn parts over an aria-hidden emerge surface, with a goo highlight in the list', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('role')).toBe('menu')
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    const list = el.querySelector<HTMLElement>('[data-slot="dropdown-menu-list"]')!
    const blob = list.firstElementChild as HTMLElement
    expect(blob.getAttribute('data-goop')).toBe('highlight')
    expect(blob.getAttribute('aria-hidden')).toBe('true')
    expect(blob.querySelectorAll('[data-goop="blob"]')).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    // shadcn parts and attributes.
    const logout = el.querySelector('#logout')!
    expect(logout.getAttribute('data-variant')).toBe('destructive')
    expect(logout.hasAttribute('data-inset')).toBe(true)
    expect(el.querySelector('[data-slot="dropdown-menu-shortcut"]')!.textContent).toBe('⇧⌘P')
    expect(el.querySelector('[data-slot="dropdown-menu-label"]')!.textContent).toBe('My account')
    expect(el.querySelector('[role="menuitemcheckbox"]')).not.toBeNull()
    expect(el.querySelectorAll('[role="menuitemradio"]')).toHaveLength(2)
    expect(el.querySelector('[data-slot="dropdown-menu-sub-trigger"]')!.getAttribute('aria-haspopup')).toBe('menu')
    // The blob draws the highlight: no flat focus background on items.
    for (const item of el.querySelectorAll('[role^="menuitem"]')) {
      expect(item.className.split(' ')).not.toContain('focus:bg-accent')
    }
    // The goo paints the panel; the list scrolls.
    const cls = el.className.split(' ')
    for (const c of ['bg-popover', 'ring-1', 'shadow-md', 'overflow-y-auto']) expect(cls).not.toContain(c)
    expect(list.className).toContain('overflow-y-auto')
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('the blob follows the highlighted item (pointer or keyboard)', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const handle = w.findComponent(GoopDropdownMenuContent).vm.highlight!
    const logout = content()!.querySelector('#logout')!
    logout.setAttribute('data-highlighted', '')
    await wait(0)
    expect(handle.target).toBe(logout)
    expect(handle.element.getAttribute('data-variant')).toBe('destructive')
    w.unmount()
  })

  it('class passthrough merges onto the panel', async () => {
    const w = mount(Demo, { props: { content: { class: 'w-48' } }, attachTo: document.body })
    await flushPromises()
    expect(content()!.className).toContain('w-48')
    expect(content()!.className).not.toContain('w-(--reka-dropdown-menu-trigger-width)')
    w.unmount()
  })

  it(':goo="false" is exactly shadcn', async () => {
    const w = mount(Demo, { props: { content: { goo: false } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-popover', 'ring-1', 'shadow-md', 'p-1']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.querySelector('[data-slot="dropdown-menu-list"]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    expect(el.querySelector('#profile')!.className.split(' ')).toContain('focus:bg-accent')
    w.unmount()
  })

  it(':highlight="false" keeps the goo panel but shadcn\'s flat highlight', async () => {
    const w = mount(Demo, { props: { content: { highlight: false } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.querySelector('[data-goop="surface"]')).not.toBeNull()
    expect(el.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(el.querySelector('#profile')!.className.split(' ')).toContain('focus:bg-accent')
    w.unmount()
  })

  it('select pops the blob, then closes once the pop has played', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    content()!.querySelector<HTMLElement>('#profile')!.click()
    await flushPromises()
    expect((w.vm as unknown as { open: boolean }).open).toBe(true)
    await wait(POP + 30)
    expect((w.vm as unknown as { open: boolean }).open).toBe(false)
    w.unmount()
  })

  it('checkbox items toggle and pop too', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    content()!.querySelector<HTMLElement>('#check')!.click()
    await flushPromises()
    const vm = w.vm as unknown as { open: boolean; checked: boolean }
    expect(vm.checked).toBe(true)
    expect(vm.open).toBe(true)
    await wait(POP + 30)
    expect(vm.open).toBe(false)
    w.unmount()
  })

  it("a consumer's preventDefault keeps the menu open", async () => {
    const w = mount(Demo, { props: { onPick: (e: Event) => e.preventDefault() }, attachTo: document.body })
    await flushPromises()
    content()!.querySelector<HTMLElement>('#profile')!.click()
    await wait(POP + 30)
    expect((w.vm as unknown as { open: boolean }).open).toBe(true)
    w.unmount()
  })

  it(':pop="false" closes right away', async () => {
    const w = mount(Demo, { props: { content: { pop: false } }, attachTo: document.body })
    await flushPromises()
    content()!.querySelector<HTMLElement>('#profile')!.click()
    await flushPromises()
    expect((w.vm as unknown as { open: boolean }).open).toBe(false)
    w.unmount()
  })

  it('reduced motion: opens at rest, nothing ticks, select closes at once', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(activeTickerCount()).toBe(0)
    el.querySelector<HTMLElement>('#profile')!.click()
    await flushPromises()
    expect((w.vm as unknown as { open: boolean }).open).toBe(false)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    expect(content()!.getAttribute('data-goop-emerge')).toBe('open')
    w.unmount()
  })

  it('submenus emerge from their row and inherit the parent settings', async () => {
    const w = mount(Demo, { props: { subOpen: true, content: { preset: 'wild' } }, attachTo: document.body })
    await flushPromises()
    const el = subContent()!
    expect(el).not.toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    expect(el.querySelector('[data-goop="surface"]')).not.toBeNull()
    expect(el.querySelector('[data-goop="highlight"]')).not.toBeNull()
    expect(w.findComponent(GoopDropdownMenuSubContent).vm.handle).not.toBeNull()
    // The parent's highlight ignores the nested items.
    el.querySelector('#nested')!.setAttribute('data-highlighted', '')
    await wait(0)
    const parent = w.findComponent(GoopDropdownMenuContent).vm.highlight!
    expect(parent.target).not.toBe(el.querySelector('#nested'))
    w.unmount()
  })

  it(':submenus="false" renders plain shadcn submenus', async () => {
    const w = mount(Demo, { props: { subOpen: true, content: { submenus: false } }, attachTo: document.body })
    await flushPromises()
    const el = subContent()!
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.className.split(' ')).toContain('bg-popover')
    w.unmount()
  })
})

describe('menu props', () => {
  it('resolve to on, inherit from the parent menu, and map to core options', () => {
    const root = resolveMenuProps({ wobble: false, speed: 2 })
    expect(root).toMatchObject({ goo: true, highlight: true, pop: true, submenus: true, wobble: false, speed: 2 })
    const sub = resolveMenuProps({ pop: false }, root)
    expect(sub).toMatchObject({ wobble: false, pop: false, speed: 2 })
    const opts = toMenuOptions(sub, { preset: 'subtle' })
    expect(opts.emerge).toMatchObject({ wobble: false, preset: 'subtle', speed: 2 })
    expect(opts.highlight).toMatchObject({ pop: false, wobble: false })
    expect(toMenuOptions(resolveMenuProps({ highlight: false })).highlight).toBeNull()
  })

  it('pass the open/close momentum toggles to the panel, inherited by submenus', () => {
    const root = resolveMenuProps({ openDrips: false })
    expect(root).toMatchObject({ openSlosh: true, openDrips: false, closeSlosh: true })
    const sub = resolveMenuProps({ closeSlosh: false }, root)
    expect(toMenuOptions(sub).emerge).toMatchObject({ openSlosh: true, openDrips: false, closeSlosh: false })
  })

  it('pass the open-burst knobs to the panel, inherited by submenus (unset: core defaults)', () => {
    expect(toMenuOptions(resolveMenuProps({})).emerge.openDripAmount).toBeUndefined()
    const root = resolveMenuProps({ openDripAmount: 2, openDripVariety: 0.2 })
    const sub = resolveMenuProps({ openDripSize: 1.5 }, root)
    expect(toMenuOptions(sub).emerge).toMatchObject({ openDripAmount: 2, openDripVariety: 0.2, openDripSize: 1.5 })
  })
})

// Client tests for the React menus: DropdownMenu, ContextMenu, Menubar, NavigationMenu. Each
// renders shadcn/ui's markup, keeps engine props off the DOM, and attaches the same core
// engines as @goopui/vue (emerge bloom panel, highlight blob, select pop, goo submenus).
import type { EmergeHandle, MenuHighlightHandle } from '@goopui/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoopDropdownMenu,
  GoopDropdownMenuCheckboxItem,
  GoopDropdownMenuContent,
  GoopDropdownMenuGroup,
  GoopDropdownMenuItem,
  GoopDropdownMenuLabel,
  GoopDropdownMenuSeparator,
  GoopDropdownMenuShortcut,
  GoopDropdownMenuSub,
  GoopDropdownMenuSubContent,
  GoopDropdownMenuSubTrigger,
  GoopDropdownMenuTrigger,
  GoopProvider,
  goopComponents,
} from '../src'
import * as m from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
  vi.useRealTimers()
})

const noEngineAttrs = (el: Element, re: RegExp) => expect(el.getAttributeNames().some((n) => re.test(n))).toBe(false)

describe('GoopDropdownMenu', () => {
  function Demo(props: { content?: Record<string, unknown>; root?: Record<string, unknown>; onSelect?: (e: Event) => void; sub?: Record<string, unknown> }) {
    return h(
      GoopDropdownMenu,
      props.root ?? null,
      h(GoopDropdownMenuTrigger, null, 'Open'),
      h(
        GoopDropdownMenuContent,
        props.content ?? null,
        h(GoopDropdownMenuLabel, null, 'My Account'),
        h(
          GoopDropdownMenuGroup,
          null,
          h(GoopDropdownMenuItem, { onSelect: props.onSelect }, 'Profile', h(GoopDropdownMenuShortcut, null, '⇧⌘P')),
          h(GoopDropdownMenuItem, { variant: 'destructive' }, 'Delete'),
        ),
        h(GoopDropdownMenuSeparator),
        h(GoopDropdownMenuCheckboxItem, { checked: true }, 'Status bar'),
        h(
          GoopDropdownMenuSub,
          { open: true, ...props.sub },
          h(GoopDropdownMenuSubTrigger, null, 'Invite'),
          h(GoopDropdownMenuSubContent, null, h(GoopDropdownMenuItem, null, 'Email')),
        ),
      ),
    )
  }

  it('is in the manifest', () => {
    for (const n of ['GoopDropdownMenu', 'GoopDropdownMenuContent', 'GoopDropdownMenuItem', 'GoopDropdownMenuSubContent']) expect(goopComponents).toContain(n)
  })

  it('opens: the panel blooms on an aria-hidden surface; the items sit in a list with the goo blob', () => {
    const api = createRef<EmergeHandle>()
    const hl = createRef<MenuHighlightHandle>()
    render(h(Demo, { root: { defaultOpen: true }, content: { goopRef: api, highlightRef: hl, wobble: false, className: 'w-56' } }))
    const content = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement
    expect(content.getAttribute('role')).toBe('menu')
    expect(content.hasAttribute('data-goop-emerge')).toBe(true)
    expect(content.className).toContain('[--goop-color:var(--popover)]')
    expect(content.className).toContain('w-56')
    expect(content.className).not.toContain('bg-popover')
    noEngineAttrs(content, /^wobble$/)
    expect(content.querySelector(':scope > [data-goop="surface"]')?.getAttribute('aria-hidden')).toBe('true')
    const list = content.querySelector(':scope > [data-slot="dropdown-menu-scroll"] > [data-slot="dropdown-menu-list"]') as HTMLElement
    expect(list).not.toBeNull()
    expect(list.querySelector(':scope > [data-goop="highlight"]')).not.toBeNull()
    expect(api.current).not.toBeNull()
    expect(hl.current).not.toBeNull()
    // The blob draws the highlight: items drop shadcn's flat focus bg.
    const item = screen.getByText('Profile').closest('[data-slot="dropdown-menu-item"]')!
    expect(item.className).not.toContain('focus:bg-accent')
    expect(item.getAttribute('data-variant')).toBe('default')
    // The open submenu blooms out of its row with its own blob.
    const sub = document.querySelector('[data-slot="dropdown-menu-sub-content"]') as HTMLElement
    expect(sub.hasAttribute('data-goop-emerge')).toBe(true)
    expect(sub.querySelector('[data-slot="dropdown-menu-list"] > [data-goop="highlight"]')).not.toBeNull()
  })

  it('select pops the blob and closes once the pop has played; preventDefault keeps it open', () => {
    vi.useFakeTimers()
    const hl = createRef<MenuHighlightHandle>()
    const onOpenChange = vi.fn()
    const r = render(h(Demo, { root: { defaultOpen: true, onOpenChange }, content: { highlightRef: hl } }))
    const pop = vi.spyOn(hl.current!, 'pop').mockReturnValue(120)
    act(() => fireEvent.click(screen.getByText('Profile')))
    expect(pop).toHaveBeenCalledOnce()
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).not.toBeNull()
    expect(onOpenChange).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(130))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    r.unmount()

    const keep = vi.fn((e: Event) => e.preventDefault())
    render(h(Demo, { root: { defaultOpen: true, onOpenChange }, content: { highlightRef: hl }, onSelect: keep }))
    vi.spyOn(hl.current!, 'pop').mockReturnValue(120)
    onOpenChange.mockClear()
    act(() => fireEvent.click(screen.getByText('Profile')))
    act(() => void vi.advanceTimersByTime(500))
    expect(keep).toHaveBeenCalledOnce()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('close: core close() runs while the panel is still mounted with data-state="closed"', () => {
    const api = createRef<EmergeHandle>()
    const r = render(h(Demo, { root: { open: true }, content: { goopRef: api } }))
    const content = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement
    const calls: string[] = []
    const close = api.current!.close.bind(api.current!)
    api.current!.close = () => {
      calls.push(`${content.dataset.state}:${content.isConnected}`)
      return close()
    }
    act(() => r.rerender(h(Demo, { root: { open: false }, content: { goopRef: api } })))
    expect(calls).toEqual(['closed:true'])
  })

  it("goo={false} is shadcn's menu; submenus={false} makes submenus plain", () => {
    const r = render(h(Demo, { root: { defaultOpen: true }, content: { goo: false } }))
    const content = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement
    expect(content.className).toContain('bg-popover')
    expect(content.hasAttribute('data-goop-emerge')).toBe(false)
    expect(content.querySelector('[data-goop]')).toBeNull()
    expect(screen.getByText('Profile').closest('[data-slot="dropdown-menu-item"]')!.className).toContain('focus:bg-accent')
    r.unmount()
    render(h(Demo, { root: { defaultOpen: true }, content: { submenus: false } }))
    const sub = document.querySelector('[data-slot="dropdown-menu-sub-content"]') as HTMLElement
    expect(sub.className).toContain('bg-popover')
    expect(sub.hasAttribute('data-goop-emerge')).toBe(false)
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')!.hasAttribute('data-goop-emerge')).toBe(true)
  })

  it('reduced motion (app config): the engines attach static', () => {
    const api = createRef<EmergeHandle>()
    render(h(GoopProvider, { reducedMotion: true }, h(Demo, { root: { defaultOpen: true }, content: { goopRef: api } })))
    expect(api.current?.reducedMotion).toBe(true)
  })
})

describe('GoopContextMenu', () => {
  function Demo(props: { content?: Record<string, unknown> }) {
    return h(
      m.GoopContextMenu,
      null,
      h(m.GoopContextMenuTrigger, { className: 'h-40 w-60' }, 'Right-click here'),
      h(
        m.GoopContextMenuContent,
        props.content ?? null,
        h(m.GoopContextMenuItem, { inset: true }, 'Back'),
        h(m.GoopContextMenuSeparator),
        h(m.GoopContextMenuCheckboxItem, { checked: true }, 'Show bookmarks'),
      ),
    )
  }

  it("right-click opens a detached bloom from the click point; the trigger keeps shadcn's select-none", () => {
    const api = createRef<EmergeHandle>()
    render(h(Demo, { content: { goopRef: api, bloomFrom: 'pointer' } }))
    const trigger = screen.getByText('Right-click here')
    expect(trigger.dataset.slot).toBe('context-menu-trigger')
    expect(trigger.className).toContain('select-none')
    act(() => void fireEvent.contextMenu(trigger, { clientX: 40, clientY: 30 }))
    const content = document.querySelector('[data-slot="context-menu-content"]') as HTMLElement
    expect(content.hasAttribute('data-goop-emerge')).toBe(true)
    noEngineAttrs(content, /^bloom-?from$/i)
    expect(content.querySelector('[data-slot="context-menu-list"] > [data-goop="highlight"]')).not.toBeNull()
    expect(api.current).not.toBeNull()
    const back = screen.getByText('Back')
    expect(back.getAttribute('data-inset')).toBe('')
    expect(back.className).not.toContain('focus:bg-accent')
  })

  it("goo={false} is shadcn's context menu", () => {
    render(h(Demo, { content: { goo: false } }))
    act(() => void fireEvent.contextMenu(screen.getByText('Right-click here'), { clientX: 10, clientY: 10 }))
    const content = document.querySelector('[data-slot="context-menu-content"]') as HTMLElement
    expect(content.className).toContain('bg-popover')
    expect(content.querySelector('[data-goop]')).toBeNull()
  })
})

describe('GoopMenubar', () => {
  function Demo(props: { bar?: Record<string, unknown>; content?: Record<string, unknown> }) {
    return h(
      m.GoopMenubar,
      props.bar ?? null,
      h(m.GoopMenubarMenu, { value: 'file' }, h(m.GoopMenubarTrigger, null, 'File'), h(m.GoopMenubarContent, props.content ?? null, h(m.GoopMenubarItem, null, 'New Tab'))),
      h(m.GoopMenubarMenu, null, h(m.GoopMenubarTrigger, null, 'Edit'), h(m.GoopMenubarContent, null, h(m.GoopMenubarItem, null, 'Undo'))),
    )
  }

  it('the trigger highlight is one goo body on the bar; the open menu blooms with popover colors', () => {
    const bar = createRef<MenuHighlightHandle>()
    const api = createRef<EmergeHandle>()
    render(h(Demo, { bar: { goopRef: bar, defaultValue: 'file', wobble: false }, content: { goopRef: api } }))
    const root = document.querySelector('[data-slot="menubar"]') as HTMLElement
    expect(root.hasAttribute('data-goop-menubar')).toBe(true)
    expect(root.querySelector(':scope > [data-goop="highlight"]')).not.toBeNull()
    noEngineAttrs(root, /^wobble$/)
    expect(bar.current).not.toBeNull()
    const trigger = screen.getByText('File')
    expect(trigger.className).not.toContain('hover:bg-muted')
    const content = document.querySelector('[data-slot="menubar-content"]') as HTMLElement
    expect(content.hasAttribute('data-goop-emerge')).toBe(true)
    expect(content.querySelector('[data-slot="menubar-list"] > [data-goop="highlight"]')).not.toBeNull()
    expect(api.current).not.toBeNull()
  })

  it("goo={false} on the bar makes every part shadcn's", () => {
    render(h(Demo, { bar: { goo: false, defaultValue: 'file' } }))
    const root = document.querySelector('[data-slot="menubar"]') as HTMLElement
    expect(root.hasAttribute('data-goop-menubar')).toBe(false)
    expect(screen.getByText('File').className).toContain('hover:bg-muted')
    const content = document.querySelector('[data-slot="menubar-content"]') as HTMLElement
    expect(content.className).toContain('bg-popover')
    expect(content.querySelector('[data-goop]')).toBeNull()
  })
})

describe('GoopNavigationMenu', () => {
  function Demo(props: { root?: Record<string, unknown> }) {
    return h(
      m.GoopNavigationMenu,
      props.root ?? null,
      h(
        m.GoopNavigationMenuList,
        null,
        h(
          m.GoopNavigationMenuItem,
          { value: 'a' },
          h(m.GoopNavigationMenuTrigger, null, 'Getting started'),
          h(m.GoopNavigationMenuContent, null, h(m.GoopNavigationMenuLink, { href: '#a' }, 'Introduction')),
        ),
        h(m.GoopNavigationMenuItem, null, h(m.GoopNavigationMenuLink, { href: '#d', className: m.navigationMenuTriggerStyle() }, 'Docs')),
      ),
    )
  }

  it('the list blob, the goo viewport box and the panel link blob attach; openDrips is on by default', () => {
    const vp = createRef<unknown>()
    const r = render(h(Demo, { root: { defaultValue: 'a', speed: 2 } }))
    const root = document.querySelector('[data-slot="navigation-menu"]') as HTMLElement
    expect(root.getAttribute('data-viewport')).toBe('true')
    noEngineAttrs(root, /^speed$/)
    const list = document.querySelector('[data-slot="navigation-menu-list"]') as HTMLElement
    expect(list.parentElement!.querySelector(':scope > [data-goop="highlight"]')).not.toBeNull()
    const trigger = screen.getByText('Getting started').closest('button')!
    expect(trigger.hasAttribute('data-goop-nav-item')).toBe(true)
    expect(trigger.hasAttribute('data-navigation-menu-trigger')).toBe(true)
    const box = document.querySelector('[data-slot="navigation-menu-viewport-box"]') as HTMLElement
    expect(box.hasAttribute('data-goop-emerge')).toBe(true)
    const content = document.querySelector('[data-slot="navigation-menu-content"]') as HTMLElement
    expect(content.hasAttribute('data-goop-nav-scope')).toBe(true)
    expect(content.querySelector(':scope > [data-goop="highlight"]')).not.toBeNull()
    expect(screen.getByText('Introduction').hasAttribute('data-goop-nav-item')).toBe(true)
    expect(m.toNavigationMenuOptions({}).viewport?.openDrips).toBe(true)
    void vp
    r.unmount()
    expect(document.querySelector('[data-goop]')).toBeNull()
  })

  it("viewport={false}: the panel blooms itself under its trigger; goo={false} is shadcn's", () => {
    const bloom = createRef<EmergeHandle>()
    const Inline = () =>
      h(
        m.GoopNavigationMenu,
        { viewport: false, defaultValue: 'a' },
        h(m.GoopNavigationMenuList, null, h(m.GoopNavigationMenuItem, { value: 'a' }, h(m.GoopNavigationMenuTrigger, null, 'A'), h(m.GoopNavigationMenuContent, { bloomRef: bloom }, 'Panel'))),
      )
    const r = render(h(Inline))
    const content = document.querySelector('[data-slot="navigation-menu-content"]') as HTMLElement
    expect(content.hasAttribute('data-goop-emerge')).toBe(true)
    expect(content.querySelector(':scope > [data-goop="surface"]')).not.toBeNull()
    expect(bloom.current).not.toBeNull()
    r.unmount()
    render(h(Demo, { root: { goo: false, defaultValue: 'a' } }))
    expect(document.querySelector('[data-goop]')).toBeNull()
    expect(document.querySelector('[data-slot="navigation-menu-viewport"]')!.className).toContain('bg-popover')
  })
})

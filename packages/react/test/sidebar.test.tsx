// Client tests for GoopSidebar: shadcn/ui's Sidebar parts (React) with the same goo as
// @goopui/vue's GoopSidebar (highlight blob, pill, edge slosh, travel, GoopCollapsible
// sub-menus and pour, GoopTooltip icon-mode tooltips, mobile GoopDrawer / GoopSheet,
// GoopInput search field).
import { act, cleanup, render } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SIDEBAR_COOKIE_NAME,
  GoopCollapsible,
  GoopCollapsibleContent,
  GoopCollapsibleTrigger,
  GoopSidebar,
  GoopSidebarContent,
  GoopSidebarGroup,
  GoopSidebarGroupLabel,
  GoopSidebarHeader,
  GoopSidebarInput,
  GoopSidebarInset,
  GoopSidebarMenu,
  GoopSidebarMenuButton,
  GoopSidebarMenuItem,
  GoopSidebarMenuSkeleton,
  GoopSidebarMenuSub,
  GoopSidebarMenuSubButton,
  GoopSidebarMenuSubItem,
  GoopSidebarProvider,
  GoopSidebarRail,
  GoopSidebarTrigger,
  goopComponents,
  toSidebarOptions,
  useSidebar,
  type SidebarContextProps,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let ctx: SidebarContextProps | null = null
const Spy = () => {
  ctx = useSidebar()
  return null
}

/** A GoopCollapsible sub-menu (no goo props of its own: GoopSidebar's `submenus` decides). */
const SubMenu = () =>
  h(
    GoopCollapsible,
    { asChild: true },
    h(
      GoopSidebarMenuItem,
      null,
      h(GoopCollapsibleTrigger, { asChild: true }, h(GoopSidebarMenuButton, { id: 'docs' }, 'Docs')),
      h(
        GoopCollapsibleContent,
        null,
        h(GoopSidebarMenuSub, null, h(GoopSidebarMenuSubItem, null, h(GoopSidebarMenuSubButton, { href: '#a', isActive: true, id: 'intro' }, 'Intro'))),
      ),
    ),
  )

const Demo = ({ sidebar = {}, provider = {} }: { sidebar?: Record<string, unknown>; provider?: Record<string, unknown> }) =>
  h(
    GoopSidebarProvider,
    provider,
    h(
      GoopSidebar,
      { collapsible: 'icon', ...sidebar },
      h(GoopSidebarHeader, null, h(GoopSidebarInput, { id: 'search', placeholder: 'Search' })),
      h(
        GoopSidebarContent,
        null,
        h(
          GoopSidebarGroup,
          null,
          h(GoopSidebarGroupLabel, null, 'Platform'),
          h(
            GoopSidebarMenu,
            null,
            ...['Home', 'Inbox', 'Settings'].map((t, i) =>
              h(GoopSidebarMenuItem, { key: t }, h(GoopSidebarMenuButton, { isActive: i === 0, tooltip: t, id: `b${i}` }, h('span', null, t))),
            ),
            h(SubMenu, { key: 'sub' }),
            h(GoopSidebarMenuItem, { key: 'sk' }, h(GoopSidebarMenuSkeleton, { showIcon: true })),
          ),
        ),
      ),
      h(GoopSidebarRail),
    ),
    h(GoopSidebarInset, null, h(GoopSidebarTrigger), h(Spy)),
  )

const sidebarRoot = () => document.querySelector<HTMLElement>('[data-slot="sidebar"]')!
const panel = () => document.querySelector<HTMLElement>('[data-sidebar="sidebar"]')!
const mount = async (props: Parameters<typeof Demo>[0] = {}) => {
  const r = render(h(Demo, props))
  await act(async () => {})
  return r
}
const click = (el: Element) => act(async () => (el as HTMLElement).click())

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  document.cookie = `${SIDEBAR_COOKIE_NAME}=; max-age=0; path=/`
  delete document.documentElement.dataset.reducedMotion
  ctx = null
  vi.restoreAllMocks()
})

describe('GoopSidebar', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const n of ['GoopSidebarProvider', 'GoopSidebar', 'GoopSidebarTrigger', 'GoopSidebarRail', 'GoopSidebarInset', 'GoopSidebarMenuButton', 'GoopSidebarMenuSub', 'GoopSidebarMenuSkeleton', 'GoopSidebarSeparator', 'GoopSidebarInput'])
      expect(goopComponents).toContain(n)
  })

  it('renders shadcn markup and data attributes', async () => {
    await mount()
    const root = sidebarRoot()
    expect(root.dataset.state).toBe('expanded')
    expect(root.dataset.variant).toBe('sidebar')
    expect(root.dataset.side).toBe('left')
    expect(root.querySelector('[data-slot="sidebar-container"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="sidebar-wrapper"]')!.getAttribute('style')).toContain('--sidebar-width: 16rem')
    expect(document.getElementById('b0')!.dataset.active).toBe('true')
    expect(document.querySelector('[data-sidebar="menu-skeleton-text"]')!.getAttribute('style')).toMatch(/--skeleton-width: \d+%/)
    expect(document.querySelector('[data-sidebar="rail"]')).not.toBeNull()
  })

  it('collapses, persists the state to the cookie, and expands again; toggles on Ctrl+B', async () => {
    await mount()
    await click(document.querySelector('[data-sidebar="trigger"]')!)
    expect(sidebarRoot().dataset.state).toBe('collapsed')
    expect(sidebarRoot().dataset.collapsible).toBe('icon')
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=false`)
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    })
    expect(sidebarRoot().dataset.state).toBe('expanded')
    expect(ctx!.open).toBe(true)
  })

  it('the highlight blob follows the hovered item; the active item is the soft pill', async () => {
    await mount()
    const p = panel()
    expect(p.hasAttribute('data-goop-sidebar')).toBe(true)
    expect(p.querySelector(':scope > [data-goop="highlight"]')).not.toBeNull()
    const b1 = document.getElementById('b1')!
    b1.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(b1.hasAttribute('data-highlighted')).toBe(true)
    const b2 = document.getElementById('b2')!
    b2.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    expect(b1.hasAttribute('data-highlighted')).toBe(false)
    expect(b2.hasAttribute('data-highlighted')).toBe(true)
    expect(b2.className).not.toMatch(/(^|\s)hover:bg-/)
    expect(document.getElementById('b0')!.hasAttribute('data-goop-pill')).toBe(true)
    expect(document.getElementById('b0')!.className).not.toContain('data-[active=true]:bg-')
  })

  it('the inner edge gets the slosh layer; a GoopCollapsible sub-menu springs open, row unfilled, and pours', async () => {
    await mount()
    expect(panel().querySelector('[data-goop="sidebar-edge"]')).not.toBeNull()
    // The sidebar's defaults give the collapsible goo (jelly spring) but no row fill.
    expect(document.querySelector('[data-slot="collapsible"]')!.hasAttribute('data-goop-accordion')).toBe(true)
    const docs = document.getElementById('docs')!
    expect(docs.hasAttribute('data-goop-accordion-trigger')).toBe(false)
    await click(docs)
    expect(docs.getAttribute('data-state')).toBe('open')
    expect(docs.getAttribute('data-active')).toBe('false')
    expect(document.querySelector('[data-slot="collapsible-content"]')!.hasAttribute('data-goop-accordion-content')).toBe(true)
    expect(document.querySelector('[data-slot="sidebar-menu-sub"]')!.hasAttribute('data-goop-pour')).toBe(true)
    expect(document.getElementById('intro')!.hasAttribute('data-goop-pill')).toBe(true)
  })

  it('submenus={false} makes nested collapsibles plain (no goo, no pour); their own props win', async () => {
    const r = await mount({ sidebar: { submenus: false } })
    expect(document.querySelector('[data-slot="collapsible"]')!.hasAttribute('data-goop-accordion')).toBe(false)
    expect(document.getElementById('docs')!.hasAttribute('data-goop-accordion-trigger')).toBe(false)
    await click(document.getElementById('docs')!)
    expect(document.querySelector('[data-slot="collapsible-content"]')!.hasAttribute('data-goop-accordion-content')).toBe(false)
    expect(document.querySelector('[data-slot="sidebar-menu-sub"]')!.hasAttribute('data-goop-pour')).toBe(false)
    r.unmount()
    // A collapsible that sets `flood` itself fills its row even inside the sidebar.
    render(
      h(
        GoopSidebarProvider,
        null,
        h(
          GoopSidebar,
          null,
          h(GoopCollapsible, { flood: true }, h(GoopCollapsibleTrigger, { id: 'own' }, 'Own'), h(GoopCollapsibleContent, null, 'x')),
        ),
      ),
    )
    await act(async () => {})
    expect(document.getElementById('own')!.hasAttribute('data-goop-accordion-trigger')).toBe(true)
  })

  it('outside a sidebar a GoopCollapsible is unchanged (goo on, row fills)', async () => {
    render(h(GoopCollapsible, null, h(GoopCollapsibleTrigger, { id: 'plain' }, 'Plain'), h(GoopCollapsibleContent, null, 'x')))
    await act(async () => {})
    expect(document.getElementById('plain')!.hasAttribute('data-goop-accordion-trigger')).toBe(true)
  })

  it('icon-mode tooltips are GoopTooltips (tooltips={false}: shadcn), only while collapsed', async () => {
    const focusTip = async (id: string) => {
      await act(async () => {
        document.getElementById(id)!.focus()
      })
      return document.querySelector<HTMLElement>('[data-slot="tooltip-content"]')
    }
    const r = await mount()
    expect(await focusTip('b1')).toBeNull()
    await act(async () => document.getElementById('b1')!.blur())
    await click(document.querySelector('[data-sidebar="trigger"]')!)
    const tip = (await focusTip('b1'))!
    expect(tip).not.toBeNull()
    expect(tip.textContent).toContain('Inbox')
    expect(tip.dataset.side).toBe('right')
    expect(tip.hasAttribute('data-goop-emerge')).toBe(true)
    r.unmount()
    document.body.innerHTML = ''
    await mount({ sidebar: { tooltips: false }, provider: { defaultOpen: false } })
    const plain = (await focusTip('b1'))!
    expect(plain).not.toBeNull()
    expect(plain.hasAttribute('data-goop-emerge')).toBe(false)
    expect(plain.className).toContain('bg-foreground')
  })

  it('GoopSidebarInput is a GoopInput (goo focus ring wrapper)', async () => {
    const r = await mount()
    const input = document.getElementById('search') as HTMLInputElement
    expect(input.dataset.sidebar).toBe('input')
    expect(input.dataset.slot).toBe('sidebar-input')
    expect(input.parentElement!.dataset.slot).toBe('input-goo')
    expect(input.className).toContain('h-8')
    r.unmount()
    await mount({ sidebar: { goo: false } })
    // The input keeps its own goo toggle (GoopInput), like Vue's GoopSidebarInput.
    expect(document.getElementById('search')!.parentElement!.dataset.slot).toBe('input-goo')
  })

  it('every effect turns off on its own; goo={false} is plain shadcn', async () => {
    const r = await mount({ sidebar: { highlight: false, slosh: false, pill: false } })
    expect(panel().querySelector('[data-goop="highlight"]')).toBeNull()
    expect(panel().querySelector('[data-goop="sidebar-edge"]')).toBeNull()
    expect(document.getElementById('b0')!.hasAttribute('data-goop-pill')).toBe(false)
    expect(document.getElementById('b1')!.className).toMatch(/(^|\s)hover:bg-sidebar-accent/)
    r.unmount()
    await mount({ sidebar: { goo: false } })
    // (GoopSidebarInput keeps its own GoopInput goo toggle, as in @goopui/vue.)
    expect([...panel().querySelectorAll('[data-goop]')].filter((el) => !el.closest('[data-slot="input-goo"]'))).toEqual([])
    expect(panel().hasAttribute('data-goop-sidebar')).toBe(false)
  })

  it('maps toggles to options (same as @goopui/vue)', () => {
    expect(toSidebarOptions({}).edge).toMatchObject({ slosh: true })
    expect(toSidebarOptions({ slosh: 1.5, preset: 'wild' }).edge).toMatchObject({ slosh: 1.5, preset: 'wild' })
    expect(toSidebarOptions({ slosh: 0 }).edge).toBeNull()
    expect(toSidebarOptions({ followPointer: false }).highlight).toMatchObject({ followPointer: false })
    expect(toSidebarOptions({})).toMatchObject({ travel: true, pour: true, drawer: true, submenus: true, tooltips: true, bloom: true })
    expect(toSidebarOptions({ submenus: false }).pour).toBe(false)
    expect(toSidebarOptions({ goo: false })).toMatchObject({ highlight: null, edge: null, pill: false, travel: false, pour: false, drawer: false, submenus: false, tooltips: false, bloom: false })
  })

  it('travel: the collapse / expand uses the momentum curve, off restores shadcn timing', async () => {
    const container = () => sidebarRoot().querySelector<HTMLElement>('[data-slot="sidebar-container"]')!
    const r = await mount()
    expect(container().style.transitionTimingFunction).toMatch(/linear\(|cubic-bezier/)
    r.unmount()
    await mount({ sidebar: { travel: false } })
    expect(container().style.transitionTimingFunction).toBe('')
  })

  it('below the breakpoint it is a GoopDrawer (drawer on) or a GoopSheet (drawer off; bloom toggles its goo)', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
    )
    const r = await mount()
    expect(ctx!.isMobile).toBe(true)
    expect(document.querySelector('[data-slot="sidebar"][data-state]')).toBeNull()
    await click(document.querySelector('[data-sidebar="trigger"]')!)
    expect(ctx!.openMobile).toBe(true)
    const drawer = document.querySelector<HTMLElement>('[role="dialog"][data-mobile="true"]')!
    expect(drawer.dataset.slot).toBe('sidebar')
    expect(drawer.hasAttribute('data-goop-drawer')).toBe(true)
    expect(drawer.querySelectorAll('[data-sidebar="menu-button"]').length).toBe(4)
    expect(drawer.querySelector('[data-goop-sidebar] > [data-goop="highlight"]')).not.toBeNull()
    r.unmount()
    const r2 = await mount({ sidebar: { drawer: false } })
    await click(document.querySelector('[data-sidebar="trigger"]')!)
    const sheet = document.querySelector<HTMLElement>('[role="dialog"][data-mobile="true"]')!
    expect(sheet.hasAttribute('data-goop-drawer')).toBe(false)
    expect(sheet.dataset.slot).toBe('sidebar')
    expect(sheet.dataset.side).toBe('left')
    // bloom (default on): GoopSheetContent's goo in the sidebar color, no close button.
    expect(sheet.hasAttribute('data-goop-emerge')).toBe(true)
    expect(sheet.querySelector(':scope > [data-goop="surface"]')).not.toBeNull()
    expect(sheet.className).toContain('[--goop-color:var(--sidebar)]')
    expect(sheet.className).not.toContain('bg-sidebar')
    expect(sheet.querySelector('[data-slot="sheet-close"]')).toBeNull()
    expect(sheet.querySelector('[data-goop-sidebar] > [data-goop="highlight"]')).not.toBeNull()
    r2.unmount()
    await mount({ sidebar: { drawer: false, bloom: false } })
    await click(document.querySelector('[data-sidebar="trigger"]')!)
    const plain = document.querySelector<HTMLElement>('[role="dialog"][data-mobile="true"]')!
    expect(plain.querySelector('[data-goop="surface"]')).toBeNull()
    expect(plain.className).toContain('bg-sidebar')
    expect(plain.className).toContain('slide-in-from-left-10')
  })

  it('reduced motion: the edge is still', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    await mount()
    await click(document.querySelector('[data-sidebar="trigger"]')!)
    expect(sidebarRoot().dataset.state).toBe('collapsed')
    expect(panel().querySelector('[data-goop="highlight"]')).not.toBeNull()
    const edge = panel().querySelector<HTMLElement>('[data-goop="sidebar-edge"]')
    for (const b of edge?.querySelectorAll<HTMLElement>('[data-goop="drip"],[data-goop="blob"]') ?? []) expect(b.style.transform).toMatch(/scale\(0\)|^$/)
  })

  it('useSidebar throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(h(Spy))).toThrow(/within a GoopSidebarProvider/)
  })
})

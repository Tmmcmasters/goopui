import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
import {
  GoopCollapsible,
  GoopCollapsibleContent,
  GoopCollapsibleTrigger,
  GoopSidebar,
  GoopSidebarContent,
  GoopSidebarGroup,
  GoopSidebarGroupLabel,
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
  SIDEBAR_COOKIE_NAME,
  goopComponents,
  toSidebarOptions,
  useSidebar,
} from '../src'

let ctx: ReturnType<typeof useSidebar> | null = null
const Spy = defineComponent({
  setup() {
    ctx = useSidebar()
    return () => null
  },
})

const Demo = defineComponent({
  props: {
    sidebar: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    provider: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    return () =>
      h(GoopSidebarProvider, props.provider, () => [
        h(GoopSidebar, { collapsible: 'icon', ...props.sidebar }, () => [
          h(GoopSidebarContent, null, () => [
            h(GoopSidebarGroup, null, () => [
              h(GoopSidebarGroupLabel, null, () => 'Platform'),
              h(GoopSidebarMenu, null, () => [
                ...['Home', 'Inbox', 'Settings'].map((t, i) =>
                  h(GoopSidebarMenuItem, { key: t }, () =>
                    h(GoopSidebarMenuButton, { isActive: i === 0, tooltip: t, id: `b${i}` }, () => h('span', t)),
                  ),
                ),
                h(GoopCollapsible, { asChild: true }, () =>
                  h(GoopSidebarMenuItem, null, () => [
                    h(GoopCollapsibleTrigger, { asChild: true }, () => h(GoopSidebarMenuButton, { id: 'docs' }, () => 'Docs')),
                    h(GoopCollapsibleContent, null, () =>
                      h(GoopSidebarMenuSub, null, () =>
                        h(GoopSidebarMenuSubItem, null, () => h(GoopSidebarMenuSubButton, { href: '#a' }, () => 'Intro')),
                      ),
                    ),
                  ]),
                ),
                h(GoopSidebarMenuItem, null, () => h(GoopSidebarMenuSkeleton, { showIcon: true })),
              ]),
            ]),
          ]),
          h(GoopSidebarRail),
        ]),
        h(GoopSidebarInset, null, () => [h(GoopSidebarTrigger), h(Spy)]),
      ])
  },
})

const sidebarRoot = () => document.querySelector<HTMLElement>('[data-slot="sidebar"]')!
const panel = () => document.querySelector<HTMLElement>('[data-sidebar="sidebar"]')!
const mountDemo = async (props: Record<string, unknown> = {}) => {
  const w = mount(Demo, { props, attachTo: document.body })
  await flushPromises()
  return w
}

afterEach(() => {
  document.body.innerHTML = ''
  document.cookie = `${SIDEBAR_COOKIE_NAME}=; max-age=0; path=/`
  delete document.documentElement.dataset.reducedMotion
  ctx = null
  vi.restoreAllMocks()
})

describe('GoopSidebar', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const part of [
      'Provider', '', 'Trigger', 'Rail', 'Inset', 'Header', 'Footer', 'Content', 'Group', 'GroupLabel', 'GroupAction',
      'GroupContent', 'Menu', 'MenuItem', 'MenuButton', 'MenuAction', 'MenuBadge', 'MenuSkeleton', 'MenuSub', 'MenuSubItem',
      'MenuSubButton', 'Separator', 'Input',
    ])
      expect(goopComponents).toContain(`GoopSidebar${part}`)
  })

  it('renders shadcn markup and data attributes', async () => {
    const w = await mountDemo()
    expect(document.querySelector('[data-slot="sidebar-wrapper"]')).not.toBeNull()
    expect(sidebarRoot().dataset.state).toBe('expanded')
    expect(sidebarRoot().dataset.variant).toBe('sidebar')
    expect(sidebarRoot().dataset.side).toBe('left')
    const buttons = document.querySelectorAll('[data-sidebar="menu-button"]')
    expect(buttons.length).toBe(4)
    expect(buttons[0]!.getAttribute('data-active')).toBe('true')
    expect(document.querySelector('[data-sidebar="menu-skeleton-text"]')).not.toBeNull()
    expect(document.querySelector('main[data-slot="sidebar-inset"]')).not.toBeNull()
    w.unmount()
  })

  it('collapses, persists the state to the cookie, and expands again', async () => {
    const w = await mountDemo()
    ;(document.querySelector('[data-sidebar="trigger"]') as HTMLElement).click()
    await flushPromises()
    expect(sidebarRoot().dataset.state).toBe('collapsed')
    expect(sidebarRoot().dataset.collapsible).toBe('icon')
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=false`)
    ;(document.querySelector('[data-sidebar="rail"]') as HTMLElement).click()
    await flushPromises()
    expect(sidebarRoot().dataset.state).toBe('expanded')
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=true`)
    w.unmount()
  })

  it('starts collapsed from the cookie', async () => {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=false; path=/`
    const w = await mountDemo()
    expect(sidebarRoot().dataset.state).toBe('collapsed')
    w.unmount()
  })

  it('toggles on Ctrl+B and Cmd+B', async () => {
    const w = await mountDemo()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await flushPromises()
    expect(ctx!.state.value).toBe('collapsed')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true }))
    await flushPromises()
    expect(ctx!.state.value).toBe('expanded')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))
    await flushPromises()
    expect(ctx!.state.value).toBe('expanded')
    w.unmount()
  })

  it('below the breakpoint it is a sheet that blooms', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) =>
        ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
    )
    const w = await mountDemo()
    expect(ctx!.isMobile.value).toBe(true)
    expect(document.querySelector('[data-slot="sidebar"][data-state]')).toBeNull()
    ;(document.querySelector('[data-sidebar="trigger"]') as HTMLElement).click()
    await flushPromises()
    expect(ctx!.openMobile.value).toBe(true)
    const sheet = document.querySelector<HTMLElement>('[role="dialog"][data-mobile="true"]')
    expect(sheet).not.toBeNull()
    expect(sheet!.querySelector('[data-goop="surface"]')).not.toBeNull()
    expect(sheet!.querySelectorAll('[data-sidebar="menu-button"]').length).toBe(4)
    w.unmount()
  })

  it('the highlight blob follows the hovered item', async () => {
    const w = await mountDemo()
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
    // The blob paints the hover: no flat hover bg; the active item is the soft pill.
    expect(b2.className).not.toMatch(/(^|\s)hover:bg-/)
    expect(document.getElementById('b0')!.hasAttribute('data-goop-pill')).toBe(true)
    expect(document.getElementById('b0')!.className).not.toContain('data-[active=true]:bg-')
    w.unmount()
  })

  it('the inner edge gets the slosh layer; sub-menus spring open without filling their row', async () => {
    const w = await mountDemo()
    expect(panel().querySelector('[data-goop="sidebar-edge"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="collapsible"]')!.hasAttribute('data-goop-accordion')).toBe(true)
    // Only the active item is a pill: an open parent keeps shadcn's look (no row fill).
    const docs = document.getElementById('docs')!
    expect(docs.hasAttribute('data-goop-accordion-trigger')).toBe(false)
    docs.click()
    await flushPromises()
    expect(docs.getAttribute('data-state')).toBe('open')
    expect(docs.querySelector('[data-goop]')).toBeNull()
    expect(docs.hasAttribute('data-goop-pill')).toBe(true)
    expect(docs.getAttribute('data-active')).not.toBe('true')
    expect(document.querySelector('[data-slot="collapsible-content"]')!.hasAttribute('data-goop-accordion-content')).toBe(true)
    w.unmount()
  })

  it('a sub-menu that sets flood itself still fills its row', async () => {
    const W = defineComponent({
      setup: () => () =>
        h(GoopSidebarProvider, null, () =>
          h(GoopSidebar, null, () =>
            h(GoopSidebarMenu, null, () =>
              h(GoopCollapsible, { asChild: true, flood: true }, () =>
                h(GoopSidebarMenuItem, null, () => [
                  h(GoopCollapsibleTrigger, { asChild: true }, () => h(GoopSidebarMenuButton, { id: 'own' }, () => 'Own')),
                  h(GoopCollapsibleContent, null, () => 'x'),
                ]),
              ),
            ),
          ),
        ),
    })
    const w = mount(W, { attachTo: document.body })
    await flushPromises()
    expect(document.getElementById('own')!.hasAttribute('data-goop-accordion-trigger')).toBe(true)
    w.unmount()
  })

  it('a collapsible outside a sidebar keeps its row flood', async () => {
    const W = defineComponent({
      setup: () => () =>
        h(GoopCollapsible, null, () => [
          h(GoopCollapsibleTrigger, { id: 'solo' }, () => 'Solo'),
          h(GoopCollapsibleContent, null, () => 'x'),
        ]),
    })
    const w = mount(W, { attachTo: document.body })
    await flushPromises()
    expect(document.getElementById('solo')!.hasAttribute('data-goop-accordion-trigger')).toBe(true)
    w.unmount()
  })

  it('every effect turns off on its own', async () => {
    const w = await mountDemo({ sidebar: { highlight: false, slosh: false, submenus: false, pill: false } })
    const p = panel()
    expect(p.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(p.querySelector('[data-goop="sidebar-edge"]')).toBeNull()
    expect(document.querySelector('[data-slot="collapsible"]')!.hasAttribute('data-goop-accordion')).toBe(false)
    expect(document.getElementById('b0')!.hasAttribute('data-goop-pill')).toBe(false)
    expect(document.getElementById('b1')!.className).toMatch(/(^|\s)hover:bg-sidebar-accent/)
    w.unmount()
  })

  it('goo: false is plain shadcn', async () => {
    const opts = toSidebarOptions({ goo: false })
    expect(opts).toMatchObject({ highlight: null, edge: null, pill: false, submenus: false, tooltips: false, bloom: false })
    const w = await mountDemo({ sidebar: { goo: false } })
    expect(panel().querySelector('[data-goop]')).toBeNull()
    w.unmount()
  })

  it('maps toggles to options', () => {
    expect(toSidebarOptions({}).edge).toMatchObject({ slosh: true })
    expect(toSidebarOptions({ slosh: 1.5, preset: 'wild' }).edge).toMatchObject({ slosh: 1.5, preset: 'wild' })
    expect(toSidebarOptions({ slosh: 0 }).edge).toBeNull()
    expect(toSidebarOptions({ followPointer: false }).highlight).toMatchObject({ followPointer: false })
    expect(toSidebarOptions({ tooltips: false }).tooltips).toBe(false)
    expect(toSidebarOptions({ bloom: false }).bloom).toBe(false)
  })

  it('reduced motion: the edge is still and the highlight snaps', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = await mountDemo()
    ;(document.querySelector('[data-sidebar="trigger"]') as HTMLElement).click()
    await flushPromises()
    expect(sidebarRoot().dataset.state).toBe('collapsed')
    const blob = panel().querySelector<HTMLElement>('[data-goop="highlight"]')
    expect(blob).not.toBeNull()
    const edge = panel().querySelector<HTMLElement>('[data-goop="sidebar-edge"]')
    // Nothing bulges: every goo circle is zero-sized.
    const blobs = [...(edge?.querySelectorAll<HTMLElement>('[data-goop="drip"],[data-goop="blob"]') ?? [])]
    for (const b of blobs) expect(b.style.transform).toMatch(/scale\(0\)|^$/)
    w.unmount()
  })
})

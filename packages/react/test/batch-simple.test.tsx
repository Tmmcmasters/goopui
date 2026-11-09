// Client tests for the simple React batch: Alert, Kbd, Breadcrumb, Empty, ButtonGroup,
// Pagination, Accordion, Collapsible. Each renders shadcn/ui's markup, keeps engine props off
// the DOM, and attaches the same core engine as @goopui/vue.
import {
  ACCORDION_FLOODED_ATTR,
  ACCORDION_STILL_ATTR,
  ACCORDION_TIMING_VARS,
  activeTickerCount,
  type AccordionHandle,
  type AlertHandle,
  type ButtonGroupHandle,
  type EmptyPuddleHandle,
  type KbdHandle,
  type MenuHighlightHandle,
} from '@goopui/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  GoopAccordion,
  GoopAccordionContent,
  GoopAccordionItem,
  GoopAccordionTrigger,
  GoopAlert,
  GoopAlertAction,
  GoopAlertDescription,
  GoopAlertTitle,
  GoopBreadcrumb,
  GoopBreadcrumbEllipsis,
  GoopBreadcrumbItem,
  GoopBreadcrumbLink,
  GoopBreadcrumbList,
  GoopBreadcrumbPage,
  GoopBreadcrumbSeparator,
  GoopButton,
  GoopButtonGroup,
  GoopButtonGroupSeparator,
  GoopButtonGroupText,
  GoopCollapsible,
  GoopCollapsibleContent,
  GoopCollapsibleTrigger,
  GoopEmpty,
  GoopEmptyContent,
  GoopEmptyDescription,
  GoopEmptyHeader,
  GoopEmptyMedia,
  GoopEmptyTitle,
  GoopKbd,
  GoopKbdGroup,
  GoopPagination,
  GoopPaginationContent,
  GoopPaginationEllipsis,
  GoopPaginationFirst,
  GoopPaginationItem,
  GoopPaginationLink,
  GoopPaginationNext,
  GoopPaginationPrevious,
  GoopProvider,
  alertVariants,
  buttonGroupVariants,
  emptyMediaVariants,
  goopComponents,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const noEngineAttrs = (el: Element, re: RegExp) => expect(el.getAttributeNames().some((n) => re.test(n))).toBe(false)
const classes = (el: Element) => el.className.split(/\s+/)

describe('manifest', () => {
  it('lists every part of the batch', () => {
    for (const n of [
      'GoopAlert', 'GoopAlertAction', 'GoopAlertDescription', 'GoopAlertTitle', 'GoopKbd', 'GoopKbdGroup',
      'GoopBreadcrumb', 'GoopBreadcrumbEllipsis', 'GoopBreadcrumbItem', 'GoopBreadcrumbLink', 'GoopBreadcrumbList', 'GoopBreadcrumbPage', 'GoopBreadcrumbSeparator',
      'GoopEmpty', 'GoopEmptyContent', 'GoopEmptyDescription', 'GoopEmptyHeader', 'GoopEmptyMedia', 'GoopEmptyTitle',
      'GoopButtonGroup', 'GoopButtonGroupSeparator', 'GoopButtonGroupText',
      'GoopPagination', 'GoopPaginationContent', 'GoopPaginationEllipsis', 'GoopPaginationFirst', 'GoopPaginationItem', 'GoopPaginationLast', 'GoopPaginationLink', 'GoopPaginationNext', 'GoopPaginationPrevious',
      'GoopAccordion', 'GoopAccordionContent', 'GoopAccordionItem', 'GoopAccordionTrigger', 'GoopCollapsible', 'GoopCollapsibleContent', 'GoopCollapsibleTrigger',
    ])
      expect(goopComponents).toContain(n)
  })
})

describe('GoopAlert', () => {
  it("renders shadcn's markup and classes", () => {
    render(
      h(GoopAlert, { variant: 'destructive', className: 'mt-4', bloom: 0.5, speed: 2 } as never, h('svg'), h(GoopAlertTitle, null, 'T'), h(GoopAlertDescription, null, 'D'), h(GoopAlertAction, null, 'A')),
    )
    const el = document.querySelector('[data-slot="alert"]')!
    expect(el.getAttribute('role')).toBe('alert')
    for (const c of alertVariants({ variant: 'destructive' }).split(' ')) expect(classes(el)).toContain(c)
    expect(classes(el)).toContain('mt-4')
    expect(document.querySelector('[data-slot="alert-title"]')!.className).toContain('font-medium')
    expect(document.querySelector('[data-slot="alert-description"]')!.className).toContain('text-muted-foreground')
    expect(document.querySelector('[data-slot="alert-action"]')!.className).toContain('absolute')
    noEngineAttrs(el, /^(bloom|speed|wobble|goo)$/)
  })

  it('attaches the entrance layer after mount and removes it on unmount; goo={false} stays plain', () => {
    const api = createRef<AlertHandle>()
    const r = render(h(GoopAlert, { goopRef: api }, h(GoopAlertTitle, null, 'Saved')))
    expect(api.current).not.toBeNull()
    const layer = document.querySelector('[data-slot="alert"] [data-goop="alert"]')
    expect(layer?.getAttribute('aria-hidden')).toBe('true')
    r.unmount()
    expect(document.querySelector('[data-goop="alert"]')).toBeNull()

    const plain = createRef<AlertHandle>()
    render(h(GoopAlert, { goo: false, goopRef: plain }, 'x'))
    expect(plain.current).toBeNull()
    expect(document.querySelector('[data-goop="alert"]')).toBeNull()
    expect(document.querySelector('[data-slot="alert"]')!.hasAttribute('data-goop-host')).toBe(false)
  })
})

describe('GoopKbd', () => {
  it("renders shadcn's kbd; takes clicks only while the squish is on", () => {
    const api = createRef<KbdHandle>()
    render(h(GoopKbdGroup, null, h(GoopKbd, { goopRef: api, keys: ['Meta', 'K'], 'data-testid': 'a' } as never, '⌘'), h(GoopKbd, { goo: false, 'data-testid': 'b' } as never, 'K')))
    expect(document.querySelector('[data-slot="kbd-group"]')!.tagName).toBe('KBD')
    const a = screen.getByTestId('a')
    expect(a.tagName).toBe('KBD')
    expect(classes(a)).toContain('pointer-events-auto')
    expect(classes(screen.getByTestId('b'))).not.toContain('pointer-events-auto')
    noEngineAttrs(a, /^(keys|press|goo)$/)
    expect(api.current).not.toBeNull()
  })
})

describe('GoopBreadcrumb', () => {
  const trail = (root: Record<string, unknown> = {}, list: Record<string, unknown> = {}) =>
    h(
      GoopBreadcrumb,
      root as never,
      h(
        GoopBreadcrumbList,
        list as never,
        h(GoopBreadcrumbItem, null, h(GoopBreadcrumbLink, { href: '/' }, 'Home')),
        h(GoopBreadcrumbSeparator),
        h(GoopBreadcrumbItem, null, h(GoopBreadcrumbEllipsis)),
        h(GoopBreadcrumbSeparator),
        h(GoopBreadcrumbItem, null, h(GoopBreadcrumbPage, null, 'Here')),
      ),
    )

  it("renders shadcn's markup; the list hosts one aria-hidden blob and links get room for it", () => {
    const api = createRef<MenuHighlightHandle>()
    render(trail({ preset: 'wild' }, { goopRef: api }))
    const nav = document.querySelector('nav')!
    expect(nav.getAttribute('aria-label')).toBe('breadcrumb')
    noEngineAttrs(nav, /^(preset|goo)$/)
    const ol = document.querySelector('[data-slot="breadcrumb-list"]')!
    expect(ol.tagName).toBe('OL')
    expect(ol.getAttribute('data-goop-breadcrumb')).toBe('')
    expect(ol.querySelectorAll('[data-goop="highlight"]')).toHaveLength(1)
    expect(api.current).not.toBeNull()
    const link = document.querySelector('[data-slot="breadcrumb-link"]')!
    expect(link.tagName).toBe('A')
    expect(classes(link)).toEqual(expect.arrayContaining(['px-1', '-mx-1']))
    expect(document.querySelector('[data-slot="breadcrumb-page"]')!.getAttribute('aria-current')).toBe('page')
    expect(document.querySelectorAll('[data-slot="breadcrumb-separator"] svg')).toHaveLength(2)
    expect(document.querySelector('[data-slot="breadcrumb-ellipsis"]')!.textContent).toContain('More')
  })

  it('goo={false} on the root (or highlight={false} on the list) renders plain shadcn', () => {
    for (const [root, list] of [[{ goo: false }, {}], [{}, { highlight: false }]] as const) {
      const r = render(trail(root, list))
      expect(document.querySelector('[data-goop="highlight"]')).toBeNull()
      expect(document.querySelector('[data-slot="breadcrumb-list"]')!.hasAttribute('data-goop-breadcrumb')).toBe(false)
      expect(classes(document.querySelector('[data-slot="breadcrumb-link"]')!)).not.toContain('px-1')
      r.unmount()
    }
  })

  it('asChild links render your own element', () => {
    render(h(GoopBreadcrumb, null, h(GoopBreadcrumbList, null, h(GoopBreadcrumbItem, null, h(GoopBreadcrumbLink, { asChild: true }, h('button', { type: 'button' }, 'Go'))))))
    const link = document.querySelector('[data-slot="breadcrumb-link"]')!
    expect(link.tagName).toBe('BUTTON')
    expect(classes(link)).toContain('px-1')
  })
})

describe('GoopEmpty', () => {
  const view = (root: Record<string, unknown> = {}, media: Record<string, unknown> = {}) =>
    h(
      GoopEmpty,
      { className: 'border', ...root } as never,
      h(GoopEmptyHeader, null, h(GoopEmptyMedia, { variant: 'icon', ...media } as never, h('svg')), h(GoopEmptyTitle, null, 'No projects'), h(GoopEmptyDescription, null, 'Create one.')),
      h(GoopEmptyContent, null, 'x'),
    )

  it("renders shadcn's markup; the media hosts one aria-hidden puddle", () => {
    const api = createRef<EmptyPuddleHandle>()
    render(view({ breathe: 0.5 }, { goopRef: api }))
    expect(document.querySelector('[data-slot="empty"]')!.className).toContain('border-dashed')
    noEngineAttrs(document.querySelector('[data-slot="empty"]')!, /^(breathe|goo)$/)
    const media = document.querySelector('[data-slot="empty-icon"]')!
    expect(media.getAttribute('data-variant')).toBe('icon')
    for (const c of emptyMediaVariants({ variant: 'icon' }).split(' ')) expect(classes(media)).toContain(c)
    expect(media.querySelectorAll('[data-goop="empty-puddle"]')).toHaveLength(1)
    expect(media.querySelector('[data-goop="empty-puddle"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(api.current).not.toBeNull()
    expect(document.querySelector('[data-slot="empty-description"]')!.tagName).toBe('P')
    expect(document.querySelector('[data-slot="empty-header"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="empty-content"]')).not.toBeNull()
  })

  it('goo={false} on the root, or puddle={false} on the media, renders plain shadcn', () => {
    for (const [root, media] of [[{ goo: false }, {}], [{}, { puddle: false }]] as const) {
      const r = render(view(root, media))
      expect(document.querySelector('[data-goop="empty-puddle"]')).toBeNull()
      r.unmount()
    }
  })
})

describe('GoopButtonGroup', () => {
  it("renders shadcn's markup; GoopButtons inside keep their own goo, cut at the marked seams", async () => {
    const api = createRef<ButtonGroupHandle>()
    const r = render(
      h(
        GoopButtonGroup,
        { orientation: 'vertical', className: 'mx-2', goopRef: api, tug: false } as never,
        h(GoopButton, { variant: 'outline', 'data-testid': 'a' } as never, 'A'),
        h(GoopButton, { variant: 'outline', goo: false, 'data-testid': 'b' } as never, 'B'),
        h(GoopButtonGroupSeparator),
        h(GoopButtonGroupText, null, 'Text'),
      ),
    )
    const g = document.querySelector('[data-slot="button-group"]')!
    expect(g.getAttribute('role')).toBe('group')
    expect(g.getAttribute('data-orientation')).toBe('vertical')
    for (const c of buttonGroupVariants({ orientation: 'vertical' }).split(' ')) expect(classes(g)).toContain(c)
    expect(classes(g)).toContain('mx-2')
    noEngineAttrs(g, /^(tug|goo)$/)
    // Seam marks reach each button's goo through a MutationObserver (a microtask).
    await act(async () => {})
    // Own goo body, joined below (vertical); an explicit goo={false} stays plain.
    expect(screen.getByTestId('a').getAttribute('data-goop-host')).toBe('stroke')
    expect(screen.getByTestId('a').getAttribute('data-goop-seams')).toBe('bottom')
    expect(screen.getByTestId('a').style.clipPath).toContain('polygon(')
    expect(screen.getByTestId('b').hasAttribute('data-goop-host')).toBe(false)
    expect(screen.getByTestId('b').getAttribute('data-goop-seams')).toBe('top bottom')
    expect(screen.getByTestId('b').style.clipPath).toBe('')
    const sep = document.querySelector('[data-slot="button-group-separator"]')!
    expect(sep.getAttribute('data-orientation')).toBe('vertical')
    expect(classes(sep)).toContain('bg-input')
    expect(screen.getByText('Text').className).toContain('bg-muted')
    expect(api.current).not.toBeNull()
    // The group's goo={false} makes its buttons plain shadcn too.
    r.rerender(
      h(GoopButtonGroup, { goo: false } as never, h(GoopButton, { variant: 'outline', 'data-testid': 'a' } as never, 'A')),
    )
    expect(screen.getByTestId('a').hasAttribute('data-goop-host')).toBe(false)
    expect(screen.getByTestId('a').hasAttribute('data-goop-seams')).toBe(false)
    r.unmount()
    // Outside a group the same button has its goo.
    render(h(GoopButton, { variant: 'outline', 'data-testid': 'c' } as never, 'C'))
    expect(screen.getByTestId('c').hasAttribute('data-goop-host')).toBe(true)
  })
})

describe('GoopPagination', () => {
  function Demo(props: { root?: Record<string, unknown> }) {
    const [page, setPage] = useState(2)
    const link = (n: number) =>
      h(GoopPaginationItem, { key: n }, h(GoopPaginationLink, { href: '#', isActive: n === page, onClick: () => setPage(n) }, String(n)))
    return h(
      GoopPagination,
      props.root as never,
      h(
        GoopPaginationContent,
        null,
        h(GoopPaginationItem, null, h(GoopPaginationFirst, { href: '#' })),
        h(GoopPaginationItem, null, h(GoopPaginationPrevious, { href: '#' })),
        [1, 2, 3].map(link),
        h(GoopPaginationItem, null, h(GoopPaginationEllipsis)),
        h(GoopPaginationItem, null, h(GoopPaginationNext, { href: '#', press: false } as never)),
      ),
    )
  }
  const links = () => [...document.querySelectorAll<HTMLElement>('[data-slot="pagination-link"][data-active]')]

  it("renders shadcn's markup; the current page is one aria-hidden blob that follows isActive", () => {
    render(h(Demo, { root: { preset: 'wild' } }))
    const nav = document.querySelector('nav[data-slot="pagination"]')!
    expect(nav.getAttribute('aria-label')).toBe('pagination')
    noEngineAttrs(nav, /^(preset|goo)$/)
    const ul = document.querySelector('[data-slot="pagination-content"]')!
    expect(ul.tagName).toBe('UL')
    expect(ul.hasAttribute('data-goop-pagination')).toBe(true)
    expect(ul.hasAttribute('data-goop-menu')).toBe(true)
    expect(ul.querySelectorAll(':scope > [data-goop="highlight"]')).toHaveLength(1)
    expect(links().map((l) => l.getAttribute('data-active'))).toEqual(['false', 'true', 'false'])
    expect(links()[1]!.getAttribute('aria-current')).toBe('page')
    // Under the blob the current page drops shadcn's outline variant (the blob paints it).
    expect(links()[1]!.className).not.toContain('border-border')
    act(() => links()[2]!.click())
    expect(links()[2]!.getAttribute('aria-current')).toBe('page')
    // Previous / Next / First are ghost GoopButtons on the link.
    const prev = document.querySelector('[aria-label="Go to previous page"]')!
    expect(prev.tagName).toBe('A')
    expect(prev.hasAttribute('data-goop-host')).toBe(true)
    expect(prev.className).toContain('pl-1.5!')
    expect(document.querySelector('[aria-label="Go to first page"]')!.hasAttribute('data-goop-host')).toBe(true)
    noEngineAttrs(document.querySelector('[aria-label="Go to next page"]')!, /^press$/)
    expect(document.querySelector('[data-slot="pagination-ellipsis"]')!.textContent).toContain('More pages')
  })

  it("goo={false} renders plain shadcn (outline current page, plain ghost buttons)", () => {
    render(h(Demo, { root: { goo: false } }))
    expect(document.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(document.querySelector('[data-slot="pagination-content"]')!.hasAttribute('data-goop-pagination')).toBe(false)
    expect(links()[1]!.className).toContain('border-border')
    expect(document.querySelector('[aria-label="Go to previous page"]')!.hasAttribute('data-goop-host')).toBe(false)
  })
})

describe('GoopAccordion', () => {
  const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="accordion-item"]')]
  const triggers = () => [...document.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]')]
  const layer = (el: Element) => el.querySelector<HTMLElement>(':scope > [data-goop="layer"]')
  const view = (root: Record<string, unknown> = {}, refs: React.Ref<AccordionHandle>[] = []) =>
    h(
      GoopAccordion,
      { type: 'single', collapsible: true, className: 'w-72', ...root } as never,
      ['a', 'b', 'c'].map((v, i) =>
        h(GoopAccordionItem, { key: v, value: v, goopRef: refs[i] }, h(GoopAccordionTrigger, null, `Item ${v}`), h(GoopAccordionContent, null, `Body ${v}`)),
      ),
    )

  it('renders shadcn parts with an aria-hidden goo layer in each trigger; idle at rest', () => {
    render(view({ wobble: 2 }))
    const root = document.querySelector('[data-slot="accordion"]')!
    expect(classes(root)).toEqual(expect.arrayContaining(['w-72', 'flex-col']))
    noEngineAttrs(root, /^(wobble|goo)$/)
    expect(items()).toHaveLength(3)
    for (const item of items()) {
      expect(item.hasAttribute('data-goop-accordion')).toBe(true)
      expect(item.className).toContain('border-b')
      expect(layer(item)).toBeNull()
      const t = item.querySelector('[data-slot="accordion-trigger"]')!
      expect(t.hasAttribute('data-goop-accordion-trigger')).toBe(true)
      expect(layer(t)!.getAttribute('aria-hidden')).toBe('true')
      expect(item.style.getPropertyValue(ACCORDION_TIMING_VARS.openEase)).toMatch(/^linear\(/)
      expect(t.querySelectorAll('[data-slot="accordion-trigger-icon"]')).toHaveLength(2)
    }
    expect(triggers()[0]!.className).toContain('py-2.5')
    expect(activeTickerCount()).toBe(0)
  })

  it('opening floods the row; switching drains the old row while the new one floods', async () => {
    const refs = [createRef<AccordionHandle>(), createRef<AccordionHandle>(), createRef<AccordionHandle>()]
    const r = render(view({}, refs))
    await act(async () => void fireEvent.click(triggers()[0]!))
    expect(items()[0]!.getAttribute('data-state')).toBe('open')
    expect(document.querySelector('[data-slot="accordion-content"]')!.hasAttribute('data-goop-accordion-content')).toBe(true)
    expect(activeTickerCount()).toBeGreaterThan(0)
    expect(refs[0]!.current!.running).toBe(true)
    await act(async () => void fireEvent.click(triggers()[2]!))
    expect(items()[0]!.getAttribute('data-state')).toBe('closed')
    expect(items()[2]!.getAttribute('data-state')).toBe('open')
    expect(refs[0]!.current!.running).toBe(true)
    expect(refs[2]!.current!.running).toBe(true)
    r.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: the open row is a static flooded fill, no ticker', () => {
    render(h(GoopProvider, { reducedMotion: true }, view({ defaultValue: 'b', textFollow: false })))
    expect(items()[1]!.hasAttribute(ACCORDION_STILL_ATTR)).toBe(true)
    expect(triggers()[1]!.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(true)
    expect(triggers()[0]!.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(false)
    expect(activeTickerCount()).toBe(0)
  })

  it('goo={false}: plain shadcn', () => {
    render(view({ goo: false, defaultValue: 'a' }))
    for (const item of items()) {
      expect(item.hasAttribute('data-goop-accordion')).toBe(false)
      expect(item.querySelector('[data-goop="layer"]')).toBeNull()
    }
    expect(triggers()[0]!.hasAttribute('data-goop-accordion-trigger')).toBe(false)
    expect(document.querySelector('[data-slot="accordion-content"]')!.className).toContain('animate-accordion')
  })

  it('sound: the trigger cue flips to close while its item is open', async () => {
    render(h(GoopProvider, { sound: true }, view()))
    expect(triggers()[0]!.hasAttribute('data-cuelume-open')).toBe(true)
    await act(async () => void fireEvent.click(triggers()[0]!))
    expect(triggers()[0]!.hasAttribute('data-cuelume-close')).toBe(true)
    expect(triggers()[1]!.hasAttribute('data-cuelume-open')).toBe(true)
  })
})

describe('GoopCollapsible', () => {
  it('floods the trigger on open, the content springs, cleans up', async () => {
    const api = createRef<AccordionHandle>()
    const r = render(
      h(GoopCollapsible, { className: 'w-80', goopRef: api, droplets: false } as never, h(GoopCollapsibleTrigger, null, 'Toggle'), h(GoopCollapsibleContent, null, 'Hidden')),
    )
    const root = document.querySelector('[data-slot="collapsible"]')!
    expect(root.className).toContain('w-80')
    expect(root.hasAttribute('data-goop-accordion')).toBe(true)
    noEngineAttrs(root, /^(droplets|goo)$/)
    const trigger = document.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')!
    expect(trigger.hasAttribute('data-goop-accordion-trigger')).toBe(true)
    expect(trigger.querySelector(':scope > [data-goop="layer"]')).not.toBeNull()
    expect(api.current).not.toBeNull()
    await act(async () => void fireEvent.click(trigger))
    expect(root.getAttribute('data-state')).toBe('open')
    expect(document.querySelector('[data-slot="collapsible-content"]')!.hasAttribute('data-goop-accordion-content')).toBe(true)
    expect(activeTickerCount()).toBeGreaterThan(0)
    r.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('goo={false}: plain shadcn', () => {
    render(h(GoopCollapsible, { goo: false, defaultOpen: true }, h(GoopCollapsibleTrigger, null, 'Toggle'), h(GoopCollapsibleContent, null, 'Shown')))
    expect(document.querySelector('[data-slot="collapsible"]')!.hasAttribute('data-goop-accordion')).toBe(false)
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
    expect(document.querySelector('[data-slot="collapsible-trigger"]')!.hasAttribute('data-goop-accordion-trigger')).toBe(false)
  })
})

// Server markup hydrates on the client with no mismatch, then the goo attaches (as in
// hydration.test.tsx; react-dom/server + hydrateRoot, the same path as Next.js).
describe('hydration: simple batch', () => {
  it('hydrates every component without mismatch, then the goo attaches', async () => {
    const { renderToString } = await import('react-dom/server')
    const { hydrateRoot } = await import('react-dom/client')
    const { vi } = await import('vitest')
    const App = () =>
      h(
        GoopProvider,
        { preset: 'playful', sound: true },
        h(GoopAlert, null, h(GoopAlertTitle, null, 'Saved')),
        h(GoopKbdGroup, null, h(GoopKbd, { keys: ['Meta', 'K'] }, '⌘'), h(GoopKbd, null, 'K')),
        h(
          GoopBreadcrumb,
          null,
          h(GoopBreadcrumbList, null, h(GoopBreadcrumbItem, null, h(GoopBreadcrumbLink, { href: '/' }, 'Home')), h(GoopBreadcrumbSeparator), h(GoopBreadcrumbItem, null, h(GoopBreadcrumbPage, null, 'Here'))),
        ),
        h(GoopEmpty, null, h(GoopEmptyHeader, null, h(GoopEmptyMedia, { variant: 'icon' }, 'i'), h(GoopEmptyTitle, null, 'None'))),
        h(GoopButtonGroup, null, h(GoopButton, { variant: 'outline' }, 'A'), h(GoopButton, { variant: 'outline' }, 'B')),
        h(
          GoopPagination,
          null,
          h(
            GoopPaginationContent,
            null,
            h(GoopPaginationItem, null, h(GoopPaginationPrevious, { href: '#' })),
            h(GoopPaginationItem, null, h(GoopPaginationLink, { href: '#', isActive: true }, '1')),
            h(GoopPaginationItem, null, h(GoopPaginationLink, { href: '#' }, '2')),
            h(GoopPaginationItem, null, h(GoopPaginationNext, { href: '#' })),
          ),
        ),
        h(
          GoopAccordion,
          { type: 'single', collapsible: true, defaultValue: 'a' },
          h(GoopAccordionItem, { value: 'a' }, h(GoopAccordionTrigger, null, 'A'), h(GoopAccordionContent, null, 'Body A')),
          h(GoopAccordionItem, { value: 'b' }, h(GoopAccordionTrigger, null, 'B'), h(GoopAccordionContent, null, 'Body B')),
        ),
        h(GoopCollapsible, null, h(GoopCollapsibleTrigger, null, 'Toggle'), h(GoopCollapsibleContent, null, 'Hidden')),
      )
    const html = renderToString(App())
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.append(root)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recoverable: unknown[] = []
    let r!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      r = hydrateRoot(root, App(), { onRecoverableError: (e) => recoverable.push(e) })
    })
    const messages = [...error.mock.calls, ...warn.mock.calls].map((c) => String(c[0]))
    error.mockRestore()
    warn.mockRestore()
    expect(messages.filter((m) => /hydrat|mismatch|did not match/i.test(m))).toEqual([])
    expect(recoverable).toEqual([])

    expect(root.querySelector('[data-slot="alert"] [data-goop="alert"]')).not.toBeNull()
    expect(root.querySelector('[data-goop-breadcrumb]')!.hasAttribute('data-goop-menu')).toBe(true)
    expect(root.querySelector('[data-slot="empty-icon"] [data-goop="empty-puddle"]')).not.toBeNull()
    expect(root.querySelector('[data-goop-pagination]')!.hasAttribute('data-goop-menu')).toBe(true)
    expect(root.querySelector('[aria-label="Go to previous page"]')!.hasAttribute('data-goop-active')).toBe(true)
    // Buttons inside the group keep their own goo; the group marks their seams.
    const grouped = [...root.querySelectorAll('[data-slot="button-group"] [data-slot="button"]')]
    expect(grouped.map((b) => b.getAttribute('data-goop-seams'))).toEqual(['right', 'left'])
    for (const b of grouped) expect(b.hasAttribute('data-goop-active')).toBe(true)
    for (const t of root.querySelectorAll('[data-slot="accordion-trigger"]')) expect(t.querySelector(':scope > [data-goop="layer"]')).not.toBeNull()
    expect(root.querySelector('[data-slot="collapsible-trigger"] > [data-goop="layer"]')).not.toBeNull()

    await act(async () => r.unmount())
    expect(document.querySelector('[data-goop]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })
})

describe('props -> core options match @goopui/vue (simple batch)', () => {
  it('lists the same prop keys and sends core the same options', async () => {
    const vue = await import('../../vue/src/goop-props')
    const m = await import('../src')
    expect([...m.ALERT_PROP_KEYS]).toEqual([...vue.ALERT_PROP_KEYS])
    expect([...m.KBD_PROP_KEYS]).toEqual([...vue.KBD_PROP_KEYS])
    expect([...m.BUTTON_GROUP_PROP_KEYS]).toEqual([...vue.BUTTON_GROUP_PROP_KEYS])
    expect([...m.EMPTY_PROP_KEYS]).toEqual([...vue.EMPTY_PROP_KEYS])
    expect([...m.BREADCRUMB_PROP_KEYS]).toEqual([...vue.BREADCRUMB_PROP_KEYS])
    expect([...m.PAGINATION_PROP_KEYS]).toEqual([...vue.PAGINATION_PROP_KEYS])
    expect([...m.PAGINATION_BUTTON_PROP_KEYS]).toEqual([...vue.PAGINATION_BUTTON_PROP_KEYS])
    expect([...m.ACCORDION_PROP_KEYS]).toEqual([...vue.ACCORDION_PROP_KEYS])
    expect(Object.keys(vue.goopAlertProps).sort()).toEqual([...m.ALERT_PROP_KEYS].sort())
    expect(Object.keys(vue.goopKbdProps).sort()).toEqual([...m.KBD_PROP_KEYS].sort())
    expect(Object.keys(vue.goopButtonGroupProps).sort()).toEqual([...m.BUTTON_GROUP_PROP_KEYS].sort())

    for (const cfg of [{}, { preset: 'subtle' as const, renderer: 'canvas' as const, reducedMotion: true as const }]) {
      for (const p of [{}, { goo: false }, { bloom: false, wobble: 0.5, speed: 2, preset: 'wild' as const }]) expect(m.toAlertOptions(p, cfg)).toEqual(vue.toAlertOptions(p, cfg))
      for (const p of [{}, { goo: false }, { press: false }, { press: 0 }, { keys: ['Meta', 'K'], press: 2 }]) expect(m.toKbdOptions(p, cfg)).toEqual(vue.toKbdOptions(p, cfg))
      for (const p of [{}, { goo: false }, { tug: false, press: 2 }]) for (const o of [undefined, 'vertical' as const]) expect(m.toButtonGroupOptions(p, cfg, o)).toEqual(vue.toButtonGroupOptions(p, cfg, o))
      for (const p of [{}, { goo: false }, { puddle: false }, { puddle: 0 }, { breathe: 0.5, speed: 2 }]) expect(m.toEmptyOptions(p, cfg)).toEqual(vue.toEmptyOptions(p, cfg))
      for (const p of [{}, { goo: false }, { highlight: false }, { followPointer: false, momentum: false, speed: 2 }])
        expect(m.toBreadcrumbOptions(p, cfg)).toEqual(vue.toBreadcrumbOptions(p, cfg))
      for (const p of [{}, { goo: false }, { indicator: false }, { wobble: false, speed: 0.5 }]) expect(m.toPaginationOptions(p, cfg)).toEqual(vue.toPaginationOptions(p, cfg))
      for (const p of [{}, { goo: false }, { droplets: false, wobble: 2, jelly: 0.5, flood: true, speed: 1.5, textFollow: false }])
        expect(m.toAccordionOptions(p, cfg)).toEqual(vue.toAccordionOptions(p, cfg))
    }
    for (const p of [{}, { press: false, speed: 2, preset: 'wild' as const, goo: false }]) expect(m.toPaginationButtonProps(p)).toEqual(vue.toPaginationButtonProps(p))
    const own = { wobble: true }
    const parent = { wobble: false, preset: 'wild' as const }
    expect(m.resolveBreadcrumbProps(own, parent)).toEqual(vue.resolveBreadcrumbProps(own, parent))
    expect(m.resolvePaginationProps(own, parent)).toEqual(vue.resolvePaginationProps(own, parent))
    expect(m.resolveEmptyProps({ breathe: false }, { breathe: true, preset: 'wild' })).toEqual(vue.resolveEmptyProps({ breathe: false }, { breathe: true, preset: 'wild' }))
  })
})

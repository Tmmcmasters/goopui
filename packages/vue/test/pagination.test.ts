import { MENU_HIGHLIGHT_CIRCLES, PAGINATION_EFFECTS, PAGINATION_FEEL, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  GoopPagination,
  GoopPaginationContent,
  GoopPaginationEllipsis,
  GoopPaginationFirst,
  GoopPaginationItem,
  GoopPaginationLast,
  GoopPaginationLink,
  GoopPaginationNext,
  GoopPaginationPrevious,
  PAGINATION_PROP_KEYS,
  goopComponents,
  resolvePaginationProps,
  toPaginationButtonProps,
  toPaginationOptions,
} from '../src'

type Item = { type: 'page'; value: number } | { type: 'ellipsis' }

/** shadcn's docs example: Previous, the page window (with ellipses), Next. */
const Demo = defineComponent({
  props: {
    root: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    next: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    start: { type: Number, default: 2 },
  },
  setup(props) {
    const page = ref(props.start)
    return () =>
        h(
          GoopPagination,
          { total: 100, itemsPerPage: 10, siblingCount: 1, showEdges: true, page: page.value, 'onUpdate:page': (v: number) => (page.value = v), ...props.root },
          {
            default: ({ page: current }: { page: number }) =>
              h(GoopPaginationContent, props.content, {
                default: ({ items }: { items: Item[] }) => [
                  h(GoopPaginationFirst),
                  h(GoopPaginationPrevious),
                  ...items.map((item, i) =>
                    item.type === 'page'
                      ? h(GoopPaginationItem, { key: i, value: item.value, isActive: item.value === current }, () => String(item.value))
                      : h(GoopPaginationEllipsis, { key: i, index: i }),
                  ),
                  h(GoopPaginationNext, props.next),
                  h(GoopPaginationLast),
                ],
              }),
          },
        )
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="pagination-content"]')!
const blob = () => content().querySelector<HTMLElement>(':scope > [data-goop="highlight"]')
const pages = () => [...document.querySelectorAll<HTMLElement>('[data-slot="pagination-item"]')]
const currentPage = () => document.querySelector('[data-slot="pagination-item"][aria-current="page"]')?.textContent
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="pagination-${name}"]`)!

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopPagination', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const p of ['', 'Content', 'Item', 'Ellipsis', 'First', 'Previous', 'Next', 'Last', 'Link']) {
      expect(goopComponents).toContain(`GoopPagination${p}`)
    }
  })

  it('renders shadcn parts with ONE aria-hidden goo blob behind the pages', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-slot="pagination"]')!.className).toContain('justify-center')
    expect(content().hasAttribute('data-goop-pagination')).toBe(true)
    expect(content().querySelectorAll('[data-goop="highlight"]')).toHaveLength(1)
    const el = blob()!
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelectorAll('[data-goop="blob"]')).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    expect(pages().map((p) => p.textContent)).toEqual(['1', '2', '3', '4', '5', '10'])
    expect(document.querySelectorAll('[data-slot="pagination-ellipsis"]')).toHaveLength(1)
    // The current page is marked for the blob and keeps its text; no outline (the blob paints it).
    const current = pages()[1]!
    expect(current.getAttribute('aria-current')).toBe('page')
    expect(current.hasAttribute('data-active')).toBe(true)
    expect(current.getAttribute('data-active')).toBe('')
    expect(pages()[0]!.getAttribute('data-active')).toBe('false')
    expect(current.className).not.toContain('border-border')
    expect(current.className).toContain('text-foreground')
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('Previous / Next / First / Last are ghost GoopButtons that change the page', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    for (const name of ['first', 'previous', 'next', 'last']) {
      const b = slot(name)
      expect(b.tagName).toBe('BUTTON')
      expect(b.getAttribute('data-variant')).toBe('ghost')
      expect(b.getAttribute('data-goop-host')).toBe('hover')
    }
    expect(slot('previous').className).toContain('pl-1.5!')
    expect(slot('next').className).toContain('pr-1.5!')
    expect(slot('next').textContent).toContain('Next')
    slot('next').click()
    await flushPromises()
    expect(currentPage()).toBe('3')
    slot('last').click()
    await flushPromises()
    expect(currentPage()).toBe('10')
    expect(slot('next').hasAttribute('disabled')).toBe(true)
    w.unmount()
  })

  it('the blob follows the current page, also across a jump of several pages', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const handle = () => (w.findComponent(GoopPaginationContent).vm as unknown as { handle: { target: Element | null } }).handle
    expect(handle().target?.textContent).toBe('2')
    slot('last').click()
    await flushPromises()
    await new Promise((r) => setTimeout(r, 0))
    expect(handle().target?.textContent).toBe('10')
    expect(handle().target?.getAttribute('aria-current')).toBe('page')
    w.unmount()
  })

  it('props inherit from GoopPagination; a part wins; goo=false is plain shadcn', async () => {
    const off = mount(Demo, { props: { root: { goo: false } }, attachTo: document.body })
    await flushPromises()
    expect(blob()).toBeNull()
    expect(content().hasAttribute('data-goop-pagination')).toBe(false)
    expect(pages()[1]!.className).toContain('border-border')
    expect(slot('next').hasAttribute('data-goop-host')).toBe(false)
    off.unmount()
    document.body.innerHTML = ''

    const partWins = mount(Demo, { props: { root: { indicator: false }, content: { indicator: true } }, attachTo: document.body })
    await flushPromises()
    expect(blob()).not.toBeNull()
    partWins.unmount()
    document.body.innerHTML = ''

    const noBlob = mount(Demo, { props: { content: { indicator: false } }, attachTo: document.body })
    await flushPromises()
    expect(blob()).toBeNull()
    // The buttons keep their goo when only the blob is off.
    expect(slot('next').getAttribute('data-goop-host')).toBe('hover')
    noBlob.unmount()
  })

  it('class passthrough merges on every part', async () => {
    const w = mount(Demo, { props: { root: { class: 'mt-4' }, content: { class: 'gap-2' }, next: { class: 'px-4' } }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-slot="pagination"]')!.className).toContain('mt-4')
    expect(content().className.split(' ')).toContain('gap-2')
    expect(content().className.split(' ')).not.toContain('gap-0.5')
    expect(slot('next').className).toContain('px-4')
    w.unmount()
  })

  it('reduced motion: the blob still marks the page, nothing ticks', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(blob()).not.toBeNull()
    slot('next').click()
    await flushPromises()
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('PaginationLink: an <a> with shadcn active marks, the blob paints the active one', async () => {
    const w = mount(
      () =>
        h(GoopPagination, { total: 30, itemsPerPage: 10 }, () =>
          h(GoopPaginationContent, null, () => [
            h(GoopPaginationLink, { href: '?p=1' }, () => '1'),
            h(GoopPaginationLink, { href: '?p=2', isActive: true }, () => '2'),
          ]),
        ),
      { attachTo: document.body },
    )
    await flushPromises()
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-slot="pagination-link"]')]
    expect(links.map((l) => l.tagName)).toEqual(['A', 'A'])
    expect(links[1]!.getAttribute('aria-current')).toBe('page')
    const handle = (w.findComponent(GoopPaginationContent).vm as unknown as { handle: { target: Element | null } }).handle
    expect(handle.target).toBe(links[1])
    w.unmount()
  })
})

describe('pagination props', () => {
  it('maps every core toggle; press off turns the button squish off', () => {
    for (const e of PAGINATION_EFFECTS) expect(PAGINATION_PROP_KEYS).toContain(e)
    expect(toPaginationOptions({})).toEqual(expect.objectContaining({ feel: PAGINATION_FEEL, wobble: true, momentum: true, speed: 1 }))
    expect(toPaginationOptions({ goo: false })).toBeNull()
    expect(toPaginationOptions({ indicator: false })).toBeNull()
    expect(toPaginationOptions({ preset: 'wild' }, { preset: 'subtle' })!.preset).toBe('wild')
    expect(toPaginationOptions({}, { preset: 'subtle' })!.preset).toBe('subtle')
    expect(toPaginationButtonProps({ press: false, speed: 2, preset: 'wild' })).toEqual({ squish: false, timeScale: 2, preset: 'wild' })
    expect(toPaginationButtonProps({})).toEqual({})
    expect(resolvePaginationProps({ wobble: false }, { wobble: true, preset: 'wild' })).toEqual({ wobble: false, preset: 'wild' })
  })
})

describe('GoopPagination SSR', () => {
  it('renders shadcn markup with the current page styled, no blob', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Demo) }))
    expect(html).toContain('data-slot="pagination-content"')
    expect(html).toContain('data-goop-pagination')
    expect(html).not.toContain('data-goop="highlight"')
    expect(html).toContain('aria-current="page"')
  })
})

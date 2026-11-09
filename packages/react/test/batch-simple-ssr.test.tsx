// @vitest-environment node
// Server render of the simple batch (Alert, Kbd, Breadcrumb, Empty, ButtonGroup, Pagination,
// Accordion, Collapsible) with no DOM at all, as in ssr.test.tsx: any `document` / `window`
// access from goopUI's own code during render throws. The markup must be deterministic,
// shadcn's, and carry no goo layer.
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const TRAPPED = ['document', 'window', 'AudioContext'] as const
const trap = (name: string) =>
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      const caller = new Error().stack?.split('\n')[2] ?? ''
      if (caller.includes('node_modules')) return undefined
      throw new Error(`${name} accessed during SSR`)
    },
  })
const untrap = () => {
  for (const name of TRAPPED) delete (globalThis as Record<string, unknown>)[name]
}

async function render(view: () => React.ReactElement): Promise<string> {
  for (const name of TRAPPED) trap(name)
  try {
    const a = renderToString(view())
    const b = renderToString(view())
    expect(a).toBe(b)
    expect(a).not.toContain('data-goop-active')
    expect(a).not.toContain('data-goop="')
    expect(a).not.toContain('data-goop-menu')
    return a
  } finally {
    untrap()
  }
}

describe('SSR (react-dom/server): simple batch', () => {
  it('alert, kbd, empty and button group render shadcn markup', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        'div',
        null,
        h(m.GoopAlert, { variant: 'destructive', bloom: 0.5 } as never, h(m.GoopAlertTitle, null, 'Title'), h(m.GoopAlertDescription, null, 'Desc')),
        h(m.GoopKbdGroup, null, h(m.GoopKbd, { keys: ['Meta', 'K'] } as never, '⌘'), h(m.GoopKbd, { goo: false }, 'K')),
        h(m.GoopEmpty, null, h(m.GoopEmptyHeader, null, h(m.GoopEmptyMedia, { variant: 'icon' }, 'i'), h(m.GoopEmptyTitle, null, 'None'), h(m.GoopEmptyDescription, null, 'Desc'))),
        h(m.GoopButtonGroup, { orientation: 'vertical' }, h(m.GoopButton, { variant: 'outline' }, 'A'), h(m.GoopButtonGroupSeparator), h(m.GoopButtonGroupText, null, 'T')),
      ),
    )
    expect(html).toContain('data-slot="alert" data-goop-host="alert" role="alert"')
    expect(html).toContain('data-slot="alert-title"')
    expect(html).not.toContain('bloom')
    expect(html).toContain('<kbd data-slot="kbd-group"')
    expect(html).toContain('pointer-events-auto')
    expect(html).not.toContain('keys=')
    expect(html).toContain('data-slot="empty-icon" data-variant="icon"')
    expect(html).toContain('<p data-slot="empty-description"')
    expect(html).toContain('role="group" data-slot="button-group" data-orientation="vertical" data-goop-host="button-group"')
    // A GoopButton inside the group keeps its own goo host; seams are marked after hydration.
    expect(html).toMatch(/data-slot="button" data-variant="outline" data-size="default" data-goop-host="stroke"/)
    expect(html).not.toContain('data-goop-seams')
    expect(html).toContain('data-slot="button-group-separator"')
  })

  it('breadcrumb and pagination render shadcn markup; the current page keeps its look until the blob attaches', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        'div',
        null,
        h(
          m.GoopBreadcrumb,
          { preset: 'wild' } as never,
          h(
            m.GoopBreadcrumbList,
            null,
            h(m.GoopBreadcrumbItem, null, h(m.GoopBreadcrumbLink, { href: '/' }, 'Home')),
            h(m.GoopBreadcrumbSeparator),
            h(m.GoopBreadcrumbItem, null, h(m.GoopBreadcrumbEllipsis)),
            h(m.GoopBreadcrumbItem, null, h(m.GoopBreadcrumbPage, null, 'Here')),
          ),
        ),
        h(
          m.GoopPagination,
          null,
          h(
            m.GoopPaginationContent,
            null,
            h(m.GoopPaginationItem, null, h(m.GoopPaginationPrevious, { href: '#' })),
            h(m.GoopPaginationItem, null, h(m.GoopPaginationLink, { href: '#', isActive: true }, '1')),
            h(m.GoopPaginationItem, null, h(m.GoopPaginationLink, { href: '#' }, '2')),
            h(m.GoopPaginationItem, null, h(m.GoopPaginationEllipsis)),
            h(m.GoopPaginationItem, null, h(m.GoopPaginationNext, { href: '#' })),
          ),
        ),
      ),
    )
    expect(html).toContain('<nav aria-label="breadcrumb" data-slot="breadcrumb"')
    expect(html).not.toContain('preset')
    expect(html).toContain('<ol data-slot="breadcrumb-list" data-goop-breadcrumb=""')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('<nav role="navigation" aria-label="pagination" data-slot="pagination"')
    expect(html).toContain('<ul data-slot="pagination-content" data-goop-pagination=""')
    expect(html).toContain('data-slot="pagination-link" data-active="true"')
    expect(html).toContain('aria-label="Go to previous page"')
    expect(html).toContain('More pages')
  })

  it('accordion and collapsible render shadcn markup', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        'div',
        null,
        h(
          m.GoopAccordion,
          { type: 'single', collapsible: true, defaultValue: 'a', wobble: 2 } as never,
          h(m.GoopAccordionItem, { value: 'a' }, h(m.GoopAccordionTrigger, null, 'A'), h(m.GoopAccordionContent, null, 'Body A')),
          h(m.GoopAccordionItem, { value: 'b' }, h(m.GoopAccordionTrigger, null, 'B'), h(m.GoopAccordionContent, null, 'Body B')),
        ),
        h(m.GoopCollapsible, { defaultOpen: true }, h(m.GoopCollapsibleTrigger, null, 'Toggle'), h(m.GoopCollapsibleContent, null, 'Shown')),
      ),
    )
    expect(html).toContain('data-slot="accordion"')
    expect(html).not.toContain('wobble')
    expect(html).toContain('data-goop-accordion=""')
    expect(html).toContain('data-goop-accordion-trigger=""')
    expect(html).toContain('data-goop-accordion-content=""')
    expect(html).toContain('Body A')
    expect((html.match(/data-slot="accordion-trigger-icon"/g) ?? []).length).toBe(4)
    expect(html).toContain('data-slot="collapsible"')
    expect(html).toContain('Shown')
  })

  it("'use client' only where a component needs the client (goo or React context)", async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const client = (f: string) => /^\s*['"]use client['"]/.test(readFileSync(join(__dirname, '../src/components', f), 'utf8'))
    for (const f of [
      'alert/GoopAlert.tsx',
      'kbd/GoopKbd.tsx',
      'breadcrumb/GoopBreadcrumb.tsx',
      'empty/GoopEmpty.tsx',
      'button-group/GoopButtonGroup.tsx',
      'button-group/context.ts',
      'pagination/GoopPagination.tsx',
      'accordion/GoopAccordion.tsx',
      'accordion/context.ts',
      'collapsible/GoopCollapsible.tsx',
    ])
      expect(client(f), f).toBe(true)
    for (const f of ['alert/parts.tsx', 'kbd/parts.tsx', 'breadcrumb/parts.tsx', 'empty/parts.tsx', 'button-group/parts.tsx', 'pagination/variants.ts', 'alert/variants.ts'])
      expect(client(f), f).toBe(false)
  })
})

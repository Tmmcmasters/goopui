// @vitest-environment node
// Server render of Table, Item and Input Group with no DOM at all (as ssr.test.tsx): any
// `document` / `window` access from goopUI's own code during render throws. The markup must be
// deterministic, shadcn's, and carry no goo layer.
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

describe('SSR (react-dom/server): display batch', () => {
  it('table, item and input group render shadcn markup', async () => {
    const m = await import('../src')
    const view = () =>
      h(
        'div',
        null,
        h(
          m.GoopTable,
          { selected: true },
          h(m.GoopTableCaption, null, 'Invoices'),
          h(m.GoopTableHeader, null, h(m.GoopTableRow, null, h(m.GoopTableHead, null, 'Invoice'))),
          h(m.GoopTableBody, null, h(m.GoopTableRow, { 'data-state': 'selected' } as Record<string, string>, h(m.GoopTableCell, null, 'INV001'))),
          h(m.GoopTableFooter, null, h(m.GoopTableRow, null, h(m.GoopTableCell, null, 'Total'))),
        ),
        h(
          m.GoopItemGroup,
          null,
          h(
            m.GoopItem,
            { asChild: true },
            h(
              'a',
              { href: '#' },
              h(m.GoopItemMedia, { variant: 'icon' }, 'i'),
              h(m.GoopItemContent, null, h(m.GoopItemTitle, null, 'Title'), h(m.GoopItemDescription, null, 'Desc')),
              h(m.GoopItemActions, null, 'x'),
            ),
          ),
          h(m.GoopItemSeparator),
        ),
        h(m.GoopInputGroup, null, h(m.GoopInputGroupInput, { placeholder: 'Search' }), h(m.GoopInputGroupAddon, null, h(m.GoopInputGroupButton, null, 'Go'))),
      )
    for (const name of TRAPPED) trap(name)
    try {
      const a = renderToString(view())
      expect(renderToString(view())).toBe(a)
      expect(a).toContain('data-slot="table-container"')
      expect(a).toContain('data-goop-table')
      expect(a).toContain('data-slot="table-caption"')
      expect(a).toContain('role="list"')
      expect(a).toContain('data-slot="item-description"')
      expect(a).toContain('data-slot="item-separator"')
      expect(a).toContain('data-slot="input-group-goo"')
      expect(a).toContain('data-slot="input-group-control"')
      expect(a).not.toContain('data-goop-active')
      expect(a).not.toContain('data-goop="')
      expect(a).not.toContain('data-goop-menu')
      expect(a).not.toContain('data-goop-rest')
    } finally {
      untrap()
    }
  })
})

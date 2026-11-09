// @vitest-environment node
// Table, Item and Input Group render shadcn's markup on the server with no DOM: no goo layers,
// no stage, the wrapper the client will hydrate into.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

describe('display batch SSR', () => {
  it('renders without a DOM', async () => {
    const m = await import('../src')
    const app = createSSRApp({
      render: () =>
        h('div', [
          h(m.GoopTable, { selected: true }, () => [
            h(m.GoopTableCaption, null, () => 'Invoices'),
            h(m.GoopTableHeader, null, () => h(m.GoopTableRow, null, () => h(m.GoopTableHead, null, () => 'Invoice'))),
            h(m.GoopTableBody, null, () => h(m.GoopTableRow, { 'data-state': 'selected' }, () => h(m.GoopTableCell, null, () => 'INV001'))),
            h(m.GoopTableFooter, null, () => h(m.GoopTableRow, null, () => h(m.GoopTableCell, null, () => 'Total'))),
          ]),
          h(m.GoopItemGroup, null, () => [
            h(m.GoopItem, { as: 'a', href: '#' }, () => [
              h(m.GoopItemMedia, { variant: 'icon' }, () => 'i'),
              h(m.GoopItemContent, null, () => [h(m.GoopItemTitle, null, () => 'Title'), h(m.GoopItemDescription, null, () => 'Desc')]),
              h(m.GoopItemActions, null, () => 'x'),
            ]),
            h(m.GoopItemSeparator),
          ]),
          h(m.GoopInputGroup, null, () => [h(m.GoopInputGroupInput, { placeholder: 'Search' }), h(m.GoopInputGroupAddon, null, () => h(m.GoopInputGroupButton, null, () => 'Go'))]),
        ]),
    })
    const html = await renderToString(app)
    expect(html).toContain('data-slot="table-container"')
    expect(html).toContain('data-goop-table')
    expect(html).toContain('data-slot="table-caption"')
    // A link item: the group is a plain <div> of links (no list / listitem roles).
    expect(html).not.toContain('role="list')
    expect(html).toContain('data-slot="item-description"')
    expect(html).toContain('data-slot="item-separator"')
    expect(html).toContain('data-slot="input-group-goo"')
    expect(html).toContain('data-slot="input-group-control"')
    expect(html).not.toContain('data-goop="highlight"')
    expect(html).not.toContain('data-goop="table-stage"')
    expect(html).not.toContain('data-goop-active')
    expect(html).not.toContain('data-goop-rest')
  })
})

// GoopTable, GoopItem / GoopItemGroup, GoopInputGroup: markup, goo attach / detach, props, and
// SSR markup hydrating with no mismatch.
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  INPUT_GROUP_PROP_KEYS,
  ITEM_GROUP_PROP_KEYS,
  ITEM_PROP_KEYS,
  TABLE_PROP_KEYS,
  GoopInputGroup,
  GoopInputGroupAddon,
  GoopInputGroupButton,
  GoopInputGroupInput,
  GoopInputGroupText,
  GoopInputGroupTextarea,
  GoopItem,
  GoopItemContent,
  GoopItemGroup,
  GoopItemTitle,
  GoopTable,
  GoopTableBody,
  GoopTableCell,
  GoopTableEmpty,
  GoopTableHead,
  GoopTableHeader,
  GoopTableRow,
  goopComponents,
  resolveItemProps,
  toInputGroupOptions,
  toItemGroupOptions,
  toItemPressOptions,
  toTableOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

const table = (props: Record<string, unknown> = {}) =>
  h(GoopTable, props, () => [
    h(GoopTableHeader, null, () => h(GoopTableRow, null, () => h(GoopTableHead, null, () => 'Name'))),
    h(GoopTableBody, null, () => [
      h(GoopTableRow, null, () => h(GoopTableCell, null, () => 'A')),
      h(GoopTableRow, { 'data-state': 'selected' }, () => h(GoopTableCell, null, () => 'B')),
      h(GoopTableEmpty, { colspan: 1 }, () => 'Nothing'),
    ]),
  ])

const items = (props: Record<string, unknown> = {}, itemProps: Record<string, unknown> = {}) =>
  h(GoopItemGroup, props, () => [
    h(GoopItem, { as: 'a', href: '#a', variant: 'outline', ...itemProps }, () => h(GoopItemContent, null, () => h(GoopItemTitle, null, () => 'A'))),
    h(GoopItem, null, () => 'Plain'),
  ])

const group = (props: Record<string, unknown> = {}) =>
  h(GoopInputGroup, { class: 'max-w-sm', ...props }, () => [
    h(GoopInputGroupInput, { placeholder: 'Search' }),
    h(GoopInputGroupAddon, null, () => h(GoopInputGroupText, null, () => '@')),
    h(GoopInputGroupAddon, { align: 'inline-end' }, () => h(GoopInputGroupButton, null, () => 'Go')),
  ])

describe('props', () => {
  it('are in the manifest and map to core options', () => {
    for (const n of ['GoopTable', 'GoopTableEmpty', 'GoopItem', 'GoopItemGroup', 'GoopItemSeparator', 'GoopInputGroup', 'GoopInputGroupButton', 'GoopInputGroupTextarea'])
      expect(goopComponents).toContain(n)
    expect([...TABLE_PROP_KEYS]).toEqual(['goo', 'highlight', 'wobble', 'momentum', 'followPointer', 'selected', 'speed', 'preset', 'renderer'])
    expect([...ITEM_GROUP_PROP_KEYS]).toEqual(['goo', 'highlight', 'wobble', 'momentum', 'followPointer', 'press', 'speed', 'preset', 'renderer'])
    expect([...ITEM_PROP_KEYS]).toEqual(['goo', 'press', 'speed', 'preset'])
    expect(INPUT_GROUP_PROP_KEYS).toContain('flow')
    expect(toTableOptions({ goo: false })).toBeNull()
    expect(toTableOptions({ highlight: false })).toBeNull()
    expect(toTableOptions({})).toMatchObject({ selected: false, wobble: true, followPointer: true })
    expect(toTableOptions({ selected: true, momentum: false })).toMatchObject({ selected: true, momentum: false })
    expect(toItemGroupOptions({ highlight: false })).toBeNull()
    expect(toItemPressOptions({ press: false })).toBeNull()
    expect(toItemPressOptions({ press: 0 })).toBeNull()
    expect(toItemPressOptions({ press: 2, speed: 2 })).toMatchObject({ press: 2, speed: 2 })
    expect(resolveItemProps({ press: 2 }, { press: false, preset: 'wild', highlight: false })).toEqual({ press: 2, preset: 'wild' })
    expect(toInputGroupOptions({ goo: false })).toBeNull()
    expect(toInputGroupOptions({ flow: false, preset: 'subtle' })).toMatchObject({ flow: false, preset: 'subtle' })
  })
})

describe('GoopTable', () => {
  it("renders shadcn's markup and puts the blob in a stage beside the table", async () => {
    const w = mount({ render: () => table() }, { attachTo: document.body })
    await nextTick()
    const c = w.find('[data-slot="table-container"]')
    expect(c.classes()).toContain('overflow-x-auto')
    expect(c.attributes('data-goop-table')).toBe('')
    expect(c.element.hasAttribute('data-goop-menu')).toBe(true)
    expect(c.find(':scope > [data-goop="table-stage"] > [data-goop="highlight"]').exists()).toBe(true)
    expect(w.find('table').find('[data-goop]').exists()).toBe(false)
    expect(w.findAll('[data-slot="table-row"]')[0]!.classes()).toContain('hover:bg-muted/50')
    w.unmount()
  })

  it('goo off: plain shadcn Table, no stage', async () => {
    const w = mount({ render: () => table({ goo: false }) }, { attachTo: document.body })
    await nextTick()
    expect(w.find('[data-goop]').exists()).toBe(false)
    expect(w.find('[data-goop-table]').exists()).toBe(false)
    w.unmount()
  })

  it('selected: the blob rests on the selected row', async () => {
    const w = mount({ render: () => table({ selected: true }) }, { attachTo: document.body })
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    expect(w.find('[data-state="selected"]').attributes('data-goop-rest')).toBe('')
    w.unmount()
  })
})

describe('GoopItem / GoopItemGroup', () => {
  it("renders shadcn's markup; the group hosts one blob; a link item squishes when pressed", async () => {
    const w = mount({ render: () => items() }, { attachTo: document.body })
    await nextTick()
    const g = w.find('[data-slot="item-group"]')
    expect(g.attributes('role')).toBe('list')
    expect(g.attributes('data-goop-item-group')).toBe('')
    expect(g.find(':scope > [data-goop="highlight"]').exists()).toBe(true)
    const a = w.find('a[data-slot="item"]')
    expect(a.attributes('data-variant')).toBe('outline')
    a.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }))
    await new Promise((r) => setTimeout(r, 100))
    expect((a.element as HTMLElement).style.scale).not.toBe('')
    a.element.dispatchEvent(new PointerEvent('pointerup'))
    w.unmount()
  })

  it('the group can turn the items plain', async () => {
    const w = mount({ render: () => items({ goo: false }) }, { attachTo: document.body })
    await nextTick()
    expect(w.find('[data-goop]').exists()).toBe(false)
    const a = w.find('a[data-slot="item"]')
    a.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }))
    await new Promise((r) => setTimeout(r, 60))
    expect((a.element as HTMLElement).style.scale).toBe('')
    w.unmount()
  })
})

describe('GoopInputGroup', () => {
  it('wraps the group for the goo layer; the group keeps attrs and drops its ring while active', async () => {
    const w = mount({ render: () => group({ id: 'g' }) }, { attachTo: document.body })
    await nextTick()
    const host = w.find('[data-slot="input-group-goo"]')
    expect(host.attributes('data-goop-active')).toBe('')
    expect(host.find(':scope > [data-goop="layer"]').exists()).toBe(true)
    const g = w.find('[data-slot="input-group"]')
    expect(g.attributes('id')).toBe('g')
    expect(g.attributes('role')).toBe('group')
    expect(g.classes()).toContain('max-w-sm')
    expect(g.classes()).toContain('has-[[data-slot=input-group-control]:focus-visible]:ring-0')
    // The control is a direct child of the group (shadcn's selectors need that).
    expect(g.find(':scope > input[data-slot="input-group-control"]').exists()).toBe(true)
    // The button is a GoopButton (ghost, xs) with its own goo host.
    const b = w.find('[data-slot="input-group-addon"] button')
    expect(b.attributes('data-size')).toBe('xs')
    expect(b.attributes('data-variant')).toBe('ghost')
    expect(b.attributes('type')).toBe('button')
    w.unmount()
  })

  it('goo off: plain shadcn InputGroup (no wrapper)', async () => {
    const w = mount({ render: () => group({ goo: false }) }, { attachTo: document.body })
    await nextTick()
    expect(w.find('[data-slot="input-group-goo"]').exists()).toBe(false)
    expect(w.find('[data-slot="input-group"]').classes()).toContain('has-[[data-slot=input-group-control]:focus-visible]:ring-3')
    w.unmount()
  })

  it('textarea works as the control; clicking an addon focuses it', async () => {
    const w = mount(
      {
        render: () =>
          h(GoopInputGroup, null, () => [h(GoopInputGroupTextarea, { placeholder: 'Write' }), h(GoopInputGroupAddon, { align: 'block-end' }, () => h(GoopInputGroupText, null, () => '0/280'))]),
      },
      { attachTo: document.body },
    )
    await nextTick()
    await w.find('[data-slot="input-group-addon"]').trigger('click')
    expect(document.activeElement).toBe(w.find('textarea').element)
    w.unmount()
  })
})

describe('hydration', () => {
  it('hydrates without mismatch warnings and attaches after mount', async () => {
    const App = { render: () => [table({ selected: true }), items(), group()] }
    const html = await renderToString(createSSRApp(App))
    expect(html).not.toContain('data-goop="highlight"')
    expect(html).not.toContain('data-goop="layer"')
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.append(root)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createSSRApp(App)
    app.mount(root)
    await flushPromises()
    const messages = [...warn.mock.calls, ...error.mock.calls].map((c) => String(c[0]))
    expect(messages.filter((m) => /hydration|mismatch/i.test(m))).toEqual([])
    warn.mockRestore()
    error.mockRestore()
    expect(root.querySelector('[data-goop="table-stage"] [data-goop="highlight"]')).not.toBeNull()
    expect(root.querySelector('[data-slot="item-group"] > [data-goop="highlight"]')).not.toBeNull()
    expect(root.querySelector('[data-slot="input-group-goo"][data-goop-active]')).not.toBeNull()
    app.unmount()
    expect(root.querySelector('[data-goop="highlight"]')).toBeNull()
  })
})

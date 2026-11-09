// Client + hydration tests for Table, Item and Input Group: shadcn/ui's markup, engine props off
// the DOM, the same core engines as @goopui/vue (props map to the same core options), and the
// server markup hydrating with no mismatch before the goo attaches.
import type { InputHandle, ItemPressHandle, ListHighlightHandle, TableHighlightHandle } from '@goopui/core'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createElement as h, createRef, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
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
  INPUT_GROUP_PROP_KEYS,
  ITEM_GROUP_PROP_KEYS,
  ITEM_PROP_KEYS,
  TABLE_PROP_KEYS,
  resolveItemProps,
  toInputGroupOptions,
  toItemGroupOptions,
  toItemPressOptions,
  toTableOptions,
} from '../src'
import { goopComponents } from '../src/manifest'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const table = (props: Record<string, unknown> = {}) =>
  h(
    GoopTable,
    props,
    h(GoopTableHeader, null, h(GoopTableRow, null, h(GoopTableHead, null, 'Name'))),
    h(
      GoopTableBody,
      null,
      h(GoopTableRow, null, h(GoopTableCell, null, 'A')),
      h(GoopTableRow, { 'data-state': 'selected' } as Record<string, string>, h(GoopTableCell, null, 'B')),
      h(GoopTableEmpty, { colSpan: 1 }, 'Nothing'),
    ),
  )

const items = (props: Record<string, unknown> = {}) =>
  h(
    GoopItemGroup,
    props,
    h(GoopItem, { asChild: true, variant: 'outline' }, h('a', { href: '#a' }, h(GoopItemContent, null, h(GoopItemTitle, null, 'A')))),
    h(GoopItem, null, 'Plain'),
  )

const group = (props: Record<string, unknown> = {}) =>
  h(
    GoopInputGroup,
    { className: 'max-w-sm', ...props },
    h(GoopInputGroupInput, { placeholder: 'Search' }),
    h(GoopInputGroupAddon, null, h(GoopInputGroupText, null, '@')),
    h(GoopInputGroupAddon, { align: 'inline-end' }, h(GoopInputGroupButton, null, 'Go')),
  )

describe('props', () => {
  it('are in the manifest and map to core options', () => {
    for (const n of ['GoopTable', 'GoopTableEmpty', 'GoopItem', 'GoopItemGroup', 'GoopItemSeparator', 'GoopInputGroup', 'GoopInputGroupButton', 'GoopInputGroupTextarea'])
      expect(goopComponents).toContain(n)
    expect(toTableOptions({ goo: false })).toBeNull()
    expect(toTableOptions({})).toMatchObject({ selected: false, wobble: true })
    expect(toItemGroupOptions({ highlight: false })).toBeNull()
    expect(toItemPressOptions({ press: 0 })).toBeNull()
    expect(resolveItemProps({ press: 2 }, { press: false, preset: 'wild' })).toEqual({ press: 2, preset: 'wild' })
    expect(toInputGroupOptions({ goo: false })).toBeNull()
  })

  it('match @goopui/vue (same keys, same core options)', async () => {
    const vue = await import('../../vue/src/goop-props')
    expect([...TABLE_PROP_KEYS]).toEqual([...vue.TABLE_PROP_KEYS])
    expect([...ITEM_GROUP_PROP_KEYS]).toEqual([...vue.ITEM_GROUP_PROP_KEYS])
    expect([...ITEM_PROP_KEYS]).toEqual([...vue.ITEM_PROP_KEYS])
    expect([...INPUT_GROUP_PROP_KEYS]).toEqual([...vue.INPUT_GROUP_PROP_KEYS])
    expect(Object.keys(vue.goopInputGroupProps).sort()).toEqual(INPUT_GROUP_PROP_KEYS.filter((k) => k !== 'goo').sort())
    for (const cfg of [{}, { preset: 'wild' as const, reducedMotion: true }]) {
      for (const p of [{}, { goo: false }, { highlight: false }, { selected: true, momentum: false, speed: 2 }, { followPointer: false, preset: 'subtle' as const }])
        expect(toTableOptions(p, cfg)).toEqual(vue.toTableOptions(p, cfg))
      for (const p of [{}, { goo: false }, { highlight: false }, { wobble: false, speed: 0.5 }]) expect(toItemGroupOptions(p, cfg)).toEqual(vue.toItemGroupOptions(p, cfg))
      for (const p of [{}, { goo: false }, { press: false }, { press: 0 }, { press: 2, speed: 2 }]) expect(toItemPressOptions(p, cfg)).toEqual(vue.toItemPressOptions(p, cfg))
      for (const p of [{}, { goo: false }, { flow: false, ripple: 2, preset: 'subtle' as const }]) expect(toInputGroupOptions(p, cfg)).toEqual(vue.toInputGroupOptions(p, cfg))
      expect(resolveItemProps({ speed: 2 }, { press: 1.5, highlight: false })).toEqual(vue.resolveItemProps({ speed: 2 }, { press: 1.5, highlight: false }))
    }
  })
})

describe('GoopTable', () => {
  it("renders shadcn's markup, ref is the <table>, goopRef the handle, blob in a stage", () => {
    const ref = createRef<HTMLTableElement>()
    const goopRef = createRef<TableHighlightHandle>()
    const { container } = render(table({ ref, goopRef, className: 'my-table', selected: true }))
    const c = container.querySelector('[data-slot="table-container"]')!
    expect(c.getAttribute('data-goop-table')).toBe('')
    expect(c.hasAttribute('data-goop-menu')).toBe(true)
    expect(ref.current?.tagName).toBe('TABLE')
    expect(ref.current?.className).toContain('my-table')
    expect(ref.current?.hasAttribute('selected')).toBe(false)
    expect(goopRef.current?.element.getAttribute('data-goop')).toBe('highlight')
    expect(c.querySelector(':scope > [data-goop="table-stage"] > [data-goop="highlight"]')).not.toBeNull()
    expect(ref.current?.querySelector('[data-goop]')).toBeNull()
    expect(container.querySelector('[data-state="selected"]')!.hasAttribute('data-goop-rest')).toBe(true)
    // Hover a body row: it is lit, the selected row gives up the blob.
    fireEvent.pointerOver(container.querySelector('[data-slot="table-body"] > tr')!, { pointerType: 'mouse' })
    expect(container.querySelector('[data-slot="table-body"] > tr')!.hasAttribute('data-highlighted')).toBe(true)
  })

  it('goo off: plain shadcn Table', () => {
    const { container } = render(table({ goo: false }))
    expect(container.querySelector('[data-goop]')).toBeNull()
    expect(container.querySelector('[data-goop-table]')).toBeNull()
  })
})

describe('GoopItem / GoopItemGroup', () => {
  it('the group hosts one blob; a link item squishes when pressed; a plain one never', async () => {
    const goopRef = createRef<ListHighlightHandle>()
    const { container } = render(items({ goopRef }))
    const g = container.querySelector('[data-slot="item-group"]')!
    expect(g.getAttribute('role')).toBe('list')
    expect(g.getAttribute('data-goop-item-group')).toBe('')
    expect(goopRef.current?.element.parentElement).toBe(g)
    const a = container.querySelector<HTMLElement>('a[data-slot="item"]')!
    expect(a.getAttribute('data-variant')).toBe('outline')
    a.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }))
    await new Promise((r) => setTimeout(r, 100))
    expect(a.style.scale).not.toBe('')
    a.dispatchEvent(new PointerEvent('pointerup'))
    const plain = container.querySelector<HTMLElement>('div[data-slot="item"]')!
    plain.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }))
    await new Promise((r) => setTimeout(r, 60))
    expect(plain.style.scale).toBe('')
  })

  it('goopRef on an item is its press handle; the group can turn items plain', () => {
    const ref = createRef<ItemPressHandle>()
    render(h(GoopItem, { asChild: true, goopRef: ref }, h('button', null, 'B')))
    expect(ref.current?.scale).toEqual({ sx: 1, sy: 1 })
    cleanup()
    const { container } = render(items({ goo: false }))
    expect(container.querySelector('[data-goop]')).toBeNull()
  })
})

describe('GoopInputGroup', () => {
  it('wraps the group for the goo layer; props and ref go on the group', () => {
    const ref = createRef<HTMLDivElement>()
    const goopRef = createRef<InputHandle>()
    const { container } = render(group({ ref, goopRef, id: 'g', flow: false }))
    const host = container.querySelector('[data-slot="input-group-goo"]')!
    expect(host.getAttribute('data-goop-active')).toBe('')
    expect(host.querySelector(':scope > [data-goop="layer"]')).not.toBeNull()
    expect(ref.current?.getAttribute('data-slot')).toBe('input-group')
    expect(ref.current?.id).toBe('g')
    expect(ref.current?.hasAttribute('flow')).toBe(false)
    expect(ref.current?.className).toContain('has-[[data-slot=input-group-control]:focus-visible]:ring-0')
    expect(goopRef.current?.state).toBeTruthy()
    expect(ref.current?.querySelector(':scope > input[data-slot="input-group-control"]')).not.toBeNull()
    const b = container.querySelector('[data-slot="input-group-addon"] button')!
    expect(b.getAttribute('data-size')).toBe('xs')
    expect(b.getAttribute('data-variant')).toBe('ghost')
    expect(b.getAttribute('type')).toBe('button')
  })

  it('goo off: plain InputGroup; clicking an addon focuses the textarea', () => {
    const { container } = render(
      h(GoopInputGroup, { goo: false }, h(GoopInputGroupTextarea, { placeholder: 'Write' }), h(GoopInputGroupAddon, { align: 'block-end' }, h(GoopInputGroupText, null, '0/280'))),
    )
    expect(container.querySelector('[data-slot="input-group-goo"]')).toBeNull()
    fireEvent.click(container.querySelector('[data-slot="input-group-addon"]')!)
    expect(document.activeElement).toBe(container.querySelector('textarea'))
  })
})

describe('hydration', () => {
  it('hydrates without mismatch, then the goo attaches', async () => {
    const App = (): ReactElement => h('div', null, table({ selected: true }), items(), group())
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
    expect(root.querySelector('[data-goop="table-stage"] [data-goop="highlight"]')).not.toBeNull()
    expect(root.querySelector('[data-slot="item-group"] > [data-goop="highlight"]')).not.toBeNull()
    expect(root.querySelector('[data-slot="input-group-goo"][data-goop-active]')).not.toBeNull()
    act(() => r.unmount())
    expect(root.querySelector('[data-goop="highlight"]')).toBeNull()
  })
})

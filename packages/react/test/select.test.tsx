// Client tests for GoopSelect: shadcn/ui's markup on Radix Select, engine props kept off the
// DOM, and the same core engines as @goopui/vue (emerge bloom, menu highlight, pop, plop).
import type { EmergeHandle, MenuHighlightHandle } from '@goopui/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoopProvider,
  GoopSelect,
  GoopSelectContent,
  GoopSelectGroup,
  GoopSelectItem,
  GoopSelectLabel,
  GoopSelectSeparator,
  GoopSelectTrigger,
  GoopSelectValue,
  SELECT_PROP_KEYS,
  goopComponents,
  toSelectOptions,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const fruits = ['Apple', 'Banana', 'Blueberry']

function view(content: Record<string, unknown> = {}, root: Record<string, unknown> = {}) {
  return h(
    GoopSelect,
    { defaultValue: 'Banana', ...root },
    h(GoopSelectTrigger, { className: 'w-44', 'aria-label': 'Fruit' }, h(GoopSelectValue, { placeholder: 'Pick a fruit' })),
    h(
      GoopSelectContent,
      content,
      h(GoopSelectGroup, null, h(GoopSelectLabel, null, 'Fruits'), ...fruits.map((f) => h(GoopSelectItem, { key: f, value: f }, f))),
      h(GoopSelectSeparator),
    ),
  )
}

describe('GoopSelect', () => {
  it("renders shadcn's trigger; the list only exists while open", () => {
    render(view())
    const trigger = screen.getByRole('combobox')
    expect(trigger.dataset.slot).toBe('select-trigger')
    expect(trigger.dataset.size).toBe('default')
    expect(trigger.className).toContain('rounded-lg')
    expect(trigger.className).toContain('w-44')
    expect(trigger.querySelector('svg')).not.toBeNull()
    expect(trigger.textContent).toContain('Banana')
    expect(document.querySelector('[data-slot="select-content"]')).toBeNull()
  })

  it('open: the list is a goo emerge panel with the highlight blob; engine props stay off the DOM', async () => {
    const goopRef = createRef<EmergeHandle>()
    const highlightRef = createRef<MenuHighlightHandle>()
    await act(async () => {
      render(view({ goopRef, highlightRef, openDrips: false, plop: true, speed: 2 }, { defaultOpen: true }))
    })
    const content = document.querySelector<HTMLElement>('[data-slot="select-content"]')!
    expect(content).not.toBeNull()
    expect(content.dataset.alignTrigger).toBe('true')
    expect(content.className).toContain('[--goop-color:var(--popover)]')
    expect(content.className).not.toContain('bg-popover')
    expect(content.querySelector(':scope > [data-goop="surface"][aria-hidden="true"]')).not.toBeNull()
    expect(goopRef.current).not.toBeNull()
    expect(highlightRef.current).not.toBeNull()
    const list = content.querySelector('[data-slot="select-list"]')!
    expect(list.querySelector('[data-goop="highlight"]')).not.toBeNull()
    const item = screen.getByRole('option', { name: 'Apple' })
    expect(item.dataset.slot).toBe('select-item')
    expect(item.className).not.toContain('focus:bg-accent')
    for (const k of ['opendrips', 'plop', 'speed', 'goopref']) expect(content.getAttributeNames()).not.toContain(k)
  })

  it("goo={false} is shadcn's SelectContent: popover bg, flat item highlight, no surface", async () => {
    await act(async () => {
      render(view({ goo: false, position: 'popper' }, { defaultOpen: true }))
    })
    const content = document.querySelector<HTMLElement>('[data-slot="select-content"]')!
    expect(content.className).toContain('bg-popover')
    expect(content.className).toContain('data-[side=bottom]:translate-y-1')
    expect(content.querySelector('[data-goop="surface"]')).toBeNull()
    expect(content.querySelector('[data-slot="select-list"]')).toBeNull()
    expect(screen.getByRole('option', { name: 'Apple' }).className).toContain('focus:bg-accent')
  })

  it('choosing an item sets the value at once and holds the close until the pop has played', async () => {
    vi.useFakeTimers()
    const onValueChange = vi.fn()
    const onOpenChange = vi.fn()
    await act(async () => {
      render(view({}, { defaultOpen: true, onValueChange, onOpenChange }))
    })
    const item = screen.getByRole('option', { name: 'Blueberry' })
    await act(async () => {
      item.focus()
      fireEvent.keyDown(item, { key: 'Enter' })
    })
    expect(onValueChange).toHaveBeenCalledWith('Blueberry')
    // The pop is playing: still open.
    expect(onOpenChange).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('reduced motion (app config): no pop, so the choice closes at once like Radix', async () => {
    const onOpenChange = vi.fn()
    await act(async () => {
      render(h(GoopProvider, { reducedMotion: true }, view({}, { defaultOpen: true, onOpenChange })))
    })
    const item = screen.getByRole('option', { name: 'Apple' })
    await act(async () => {
      item.focus()
      fireEvent.keyDown(item, { key: 'Enter' })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('a consumer preventDefault cancels the choice', async () => {
    const onValueChange = vi.fn()
    await act(async () => {
      render(
        h(
          GoopSelect,
          { defaultOpen: true, onValueChange },
          h(GoopSelectTrigger, null, h(GoopSelectValue)),
          h(GoopSelectContent, null, h(GoopSelectItem, { value: 'a', onKeyDown: (e: { preventDefault(): void }) => e.preventDefault() }, 'A')),
        ),
      )
    })
    const item = screen.getByRole('option', { name: 'A' })
    await act(async () => {
      item.focus()
      fireEvent.keyDown(item, { key: 'Enter' })
    })
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('maps props to the same core options as @goopui/vue', () => {
    const o = toSelectOptions({ wobble: false, plop: false, surface: 'trigger', openDripAmount: 2 }, { preset: 'subtle' })
    expect(o.goo).toBe(true)
    expect(o.emerge).toMatchObject({ flowStyle: 'bloom', bloomStart: 'single', wobble: false, surfaceColor: 'trigger', openDripAmount: 2, preset: 'subtle' })
    expect(o.highlight).toMatchObject({ wobble: false, pop: true, followPointer: true })
    expect(o.plop).toBeNull()
    expect(toSelectOptions({ goo: false }).highlight).toBeNull()
    expect(toSelectOptions({ highlight: false }).highlight).toBeNull()
    expect(SELECT_PROP_KEYS).toContain('bloomFrom')
  })

  it('every part is in the manifest', () => {
    for (const n of ['GoopSelect', 'GoopSelectContent', 'GoopSelectGroup', 'GoopSelectItem', 'GoopSelectLabel', 'GoopSelectScrollDownButton', 'GoopSelectScrollUpButton', 'GoopSelectSeparator', 'GoopSelectTrigger', 'GoopSelectValue'])
      expect(goopComponents).toContain(n)
  })
})

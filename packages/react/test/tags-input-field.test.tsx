// Client tests for GoopTagsInput (goopUI's own React TagsInput, mirroring shadcn-vue's on reka)
// and the GoopField family: shadcn's markup, engine props kept off the DOM, the same core
// options as @goopui/vue, and reka's keyboard.
import { activeTickerCount, type FieldErrorHandle, type TagsInputHandle } from '@goopui/core'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createElement as h, createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as vue from '../../vue/src/goop-props'
import {
  FIELD_PROP_KEYS,
  GoopField,
  GoopFieldContent,
  GoopFieldDescription,
  GoopFieldError,
  GoopFieldGroup,
  GoopFieldLabel,
  GoopFieldLegend,
  GoopFieldSeparator,
  GoopFieldSet,
  GoopFieldTitle,
  GoopInput,
  GoopTagsInput,
  GoopTagsInputInput,
  GoopTagsInputItem,
  GoopTagsInputItemDelete,
  GoopTagsInputItemText,
  TAGS_INPUT_PROP_KEYS,
  fieldErrorContent,
  goopComponents,
  resolveFieldProps,
  toFieldErrorOptions,
  toTagsInputOptions,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function Tags(props: { initial?: string[]; goo?: boolean; onValueChange?: (v: string[]) => void; extra?: Record<string, unknown>; goopRef?: React.Ref<TagsInputHandle> }) {
  const [tags, setTags] = useState(props.initial ?? ['react', 'next'])
  return h(
    GoopTagsInput,
    {
      value: tags,
      onValueChange: (v: string[]) => {
        setTags(v)
        props.onValueChange?.(v)
      },
      goo: props.goo,
      goopRef: props.goopRef,
      ...props.extra,
    },
    tags.map((t) => h(GoopTagsInputItem, { key: t, value: t }, h(GoopTagsInputItemText), h(GoopTagsInputItemDelete))),
    h(GoopTagsInputInput, { placeholder: 'Add…' }),
  )
}

describe('props -> core options match @goopui/vue', () => {
  it('lists the same keys and sends core the same options', () => {
    expect([...TAGS_INPUT_PROP_KEYS]).toEqual([...vue.TAGS_INPUT_PROP_KEYS])
    expect(Object.keys(vue.goopTagsInputProps).sort()).toEqual([...TAGS_INPUT_PROP_KEYS].sort())
    expect([...FIELD_PROP_KEYS]).toEqual([...vue.FIELD_PROP_KEYS])
    for (const cfg of [{}, { preset: 'subtle' as const, renderer: 'canvas' as const, reducedMotion: true as const }]) {
      for (const p of [{}, { merge: false, melt: 0.5 }, { flow: false, ripple: 2, speed: 2, preset: 'wild' as const }])
        expect(toTagsInputOptions(p, cfg)).toEqual(vue.toTagsInputOptions(p, cfg))
      for (const p of [{}, { goo: false }, { drip: false }, { reveal: 0, speed: 2, preset: 'wild' as const }]) expect(toFieldErrorOptions(p, cfg)).toEqual(vue.toFieldErrorOptions(p, cfg))
    }
    expect(resolveFieldProps({ drip: false }, { drip: true, preset: 'wild' })).toEqual(vue.resolveFieldProps({ drip: false }, { drip: true, preset: 'wild' }))
  })

  it('every part is in the manifest', () => {
    for (const n of [
      'GoopTagsInput',
      'GoopTagsInputInput',
      'GoopTagsInputItem',
      'GoopTagsInputItemDelete',
      'GoopTagsInputItemText',
      'GoopField',
      'GoopFieldContent',
      'GoopFieldDescription',
      'GoopFieldError',
      'GoopFieldGroup',
      'GoopFieldLabel',
      'GoopFieldLegend',
      'GoopFieldSeparator',
      'GoopFieldSet',
      'GoopFieldTitle',
    ])
      expect(goopComponents).toContain(n)
  })
})

describe('GoopTagsInput', () => {
  it('renders the shadcn-vue markup in a goo wrapper; the ring attaches around the box', () => {
    const goopRef = createRef<TagsInputHandle>()
    const { container, unmount } = render(h(Tags, { goopRef, extra: { merge: false } }))
    const host = container.querySelector('[data-slot="tags-input-goo"]')!
    expect(host.hasAttribute('data-goop-active')).toBe(true)
    const box = host.querySelector(':scope > [data-slot="tags-input"]')!
    expect(box.className).toContain('rounded-md')
    expect(box.className).toContain('focus-within:ring-0')
    expect(box.hasAttribute('merge')).toBe(false)
    expect(box.querySelectorAll('[data-slot="tags-input-item"]')).toHaveLength(2)
    expect(box.querySelector('[data-slot="tags-input-item-text"]')!.textContent).toBe('react')
    expect(host.querySelector(':scope > [data-goop-part="input"]')).not.toBeNull()
    expect(goopRef.current?.input).not.toBeNull()
    unmount()
    expect(document.querySelector('[data-goop-part]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it("reka's keyboard: Enter / the delimiter add, Backspace selects then removes, the X removes", () => {
    const onValueChange = vi.fn()
    const { container } = render(h(Tags, { onValueChange }))
    const input = container.querySelector('input')!
    const texts = () => [...container.querySelectorAll('[data-slot="tags-input-item-text"]')].map((t) => t.textContent)
    input.value = 'vite'
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(texts()).toEqual(['react', 'next', 'vite'])
    expect(input.value).toBe('')
    input.value = 'remix'
    fireEvent.keyDown(input, { key: ',' })
    expect(texts()).toEqual(['react', 'next', 'vite', 'remix'])
    // A duplicate is refused.
    input.value = 'react'
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(texts()).toHaveLength(4)
    // Backspace on an empty field: selects the last tag, then removes it.
    input.setSelectionRange(0, 0)
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(container.querySelectorAll('[data-slot="tags-input-item"]')[3]!.getAttribute('data-state')).toBe('active')
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(texts()).toEqual(['react', 'next', 'vite'])
    fireEvent.click(container.querySelectorAll('[data-slot="tags-input-item-delete"]')[0]!)
    expect(texts()).toEqual(['next', 'vite'])
    expect(onValueChange).toHaveBeenLastCalledWith(['next', 'vite'])
  })

  it('max, addOnPaste and uncontrolled defaultValue', () => {
    const onInvalid = vi.fn()
    const { container } = render(
      h(
        GoopTagsInput,
        { defaultValue: ['a'], max: 3, addOnPaste: true, onInvalid },
        h(GoopTagsInputInput),
      ),
    )
    const input = container.querySelector('input')!
    fireEvent.paste(input, { clipboardData: { getData: () => 'b,c,d' } })
    expect(onInvalid).toHaveBeenCalledWith('d')
  })

  it('goo={false}: the plain box, no wrapper, no goo', () => {
    const { container } = render(h(Tags, { goo: false }))
    expect(container.querySelector('[data-slot="tags-input-goo"]')).toBeNull()
    expect(container.querySelector('[data-slot="tags-input"]')!.className).not.toContain('focus-within:ring-0')
    expect(container.querySelector('[data-goop-part]')).toBeNull()
  })
})

describe('GoopField', () => {
  it("shadcn's FieldError content", () => {
    expect(fieldErrorContent(['Required', { message: 'Required' }])).toBe('Required')
    expect(fieldErrorContent([{ message: 'Too short' }, 'No digits'])).toEqual(['Too short', 'No digits'])
    expect(fieldErrorContent([])).toBeNull()
  })

  it('renders every part; the control keeps its goo; the error appears with its drip', async () => {
    const goopRef = createRef<FieldErrorHandle>()
    function Form({ errors }: { errors: string[] }) {
      return h(
        GoopFieldSet,
        null,
        h(GoopFieldLegend, null, 'Profile'),
        h(GoopFieldDescription, null, 'About you'),
        h(
          GoopFieldGroup,
          null,
          h(
            GoopField,
            { 'data-invalid': errors.length ? true : undefined, drip: 0.5 },
            h(GoopFieldLabel, { htmlFor: 'n' }, 'Name'),
            h(GoopInput, { id: 'n', 'aria-invalid': errors.length ? true : undefined }),
            h(GoopFieldError, { errors, goopRef }),
          ),
          h(GoopFieldSeparator, null, 'Or'),
          h(GoopField, { orientation: 'horizontal' }, h(GoopFieldContent, null, h(GoopFieldTitle, null, 'Title'))),
        ),
      )
    }
    const { container, rerender } = render(h(Form, { errors: [] }))
    for (const slot of ['field-set', 'field-legend', 'field-description', 'field-group', 'field', 'field-label', 'field-separator', 'field-separator-content', 'field-content'])
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull()
    expect(container.querySelector('[data-slot="field"]')!.getAttribute('role')).toBe('group')
    expect(container.querySelector('[data-slot="field"]')!.hasAttribute('drip')).toBe(false)
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull()
    expect(container.querySelector('[data-slot="input-goo"][data-goop-active]')).not.toBeNull()
    expect(goopRef.current).toBeNull()
    await act(async () => rerender(h(Form, { errors: ['Required'] })))
    const err = container.querySelector('[data-slot="field-error"]')!
    expect(err.getAttribute('role')).toBe('alert')
    expect(err.textContent).toBe('Required')
    expect(goopRef.current).not.toBeNull()
    await act(async () => rerender(h(Form, { errors: [] })))
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull()
  })
})

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
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
  goopTagsInputProps,
  resolveFieldProps,
  toFieldErrorOptions,
  toTagsInputOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

const Tags = defineComponent({
  props: { initial: { type: Array, default: () => ['vue', 'nuxt'] }, goo: { type: Boolean, default: true } },
  setup(props) {
    const tags = ref<string[]>([...(props.initial as string[])])
    return () =>
      h(
        GoopTagsInput,
        { modelValue: tags.value, 'onUpdate:modelValue': (v: unknown[]) => (tags.value = v as string[]), goo: props.goo },
        () => [
          ...tags.value.map((t) =>
            h(GoopTagsInputItem, { key: t, value: t }, () => [h(GoopTagsInputItemText), h(GoopTagsInputItemDelete)]),
          ),
          h(GoopTagsInputInput, { placeholder: 'Add…' }),
        ],
      )
  },
})

describe('GoopTagsInput', () => {
  it('is in the manifest; props map to core options', () => {
    for (const n of ['GoopTagsInput', 'GoopTagsInputInput', 'GoopTagsInputItem', 'GoopTagsInputItemDelete', 'GoopTagsInputItemText'])
      expect(goopComponents).toContain(n)
    expect(TAGS_INPUT_PROP_KEYS).toContain('merge')
    expect(TAGS_INPUT_PROP_KEYS).toContain('melt')
    expect(TAGS_INPUT_PROP_KEYS).toContain('flow')
    expect(Object.keys(goopTagsInputProps).sort()).toEqual([...TAGS_INPUT_PROP_KEYS].sort())
    expect(toTagsInputOptions({ merge: false, melt: 0.5, speed: 2 }, { preset: 'subtle' })).toMatchObject({ merge: false, melt: 0.5, speed: 2, preset: 'subtle' })
  })

  it("renders shadcn's markup in a goo wrapper; the ring attaches around the box", async () => {
    const w = mount(Tags, { attachTo: document.body })
    await flushPromises()
    const host = document.querySelector('[data-slot="tags-input-goo"]')!
    expect(host).not.toBeNull()
    expect(host.hasAttribute('data-goop-active')).toBe(true)
    const box = host.querySelector(':scope > [data-slot="tags-input"]')!
    expect(box.className).toContain('rounded-md')
    expect(box.className).toContain('focus-within:ring-0')
    expect(box.querySelectorAll('[data-slot="tags-input-item"]')).toHaveLength(2)
    expect(box.querySelector('[data-slot="tags-input-item-text"]')!.textContent).toBe('vue')
    expect(box.querySelector('[data-slot="tags-input-input"]')).not.toBeNull()
    expect(host.querySelector(':scope > [data-goop-part="input"]')).not.toBeNull()
    expect(host.querySelector(':scope > [data-goop-part="input"]')!.getAttribute('aria-hidden')).toBe('true')
    w.unmount()
    expect(document.querySelector('[data-goop-part="input"]')).toBeNull()
  })

  it('adds a tag on Enter and removes one with its X', async () => {
    const w = mount(Tags, { attachTo: document.body })
    await flushPromises()
    const input = w.find('input')
    await input.setValue('react')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(w.findAll('[data-slot="tags-input-item"]')).toHaveLength(3)
    await w.findAll('[data-slot="tags-input-item-delete"]')[0]!.trigger('click')
    await flushPromises()
    const texts = w.findAll('[data-slot="tags-input-item-text"]').map((t) => t.text())
    expect(texts).toEqual(['nuxt', 'react'])
    w.unmount()
  })

  it(':goo="false" renders the plain box with no wrapper', async () => {
    const w = mount(Tags, { attachTo: document.body, props: { goo: false } })
    await flushPromises()
    expect(document.querySelector('[data-slot="tags-input-goo"]')).toBeNull()
    expect(document.querySelector('[data-slot="tags-input"]')!.className).not.toContain('focus-within:ring-0')
    expect(document.querySelector('[data-goop-part]')).toBeNull()
    w.unmount()
  })
})

describe('GoopField', () => {
  it('is in the manifest; props resolve and map to core options', () => {
    for (const n of ['GoopField', 'GoopFieldContent', 'GoopFieldDescription', 'GoopFieldError', 'GoopFieldGroup', 'GoopFieldLabel', 'GoopFieldLegend', 'GoopFieldSeparator', 'GoopFieldSet', 'GoopFieldTitle'])
      expect(goopComponents).toContain(n)
    expect([...FIELD_PROP_KEYS]).toEqual(['goo', 'drip', 'reveal', 'speed', 'preset', 'renderer'])
    expect(resolveFieldProps({ drip: false }, { drip: true, preset: 'wild' })).toEqual({ drip: false, preset: 'wild' })
    expect(toFieldErrorOptions({ goo: false })).toBeNull()
    expect(toFieldErrorOptions({ reveal: 0, speed: 2 }, { preset: 'subtle' })).toMatchObject({ reveal: 0, speed: 2, preset: 'subtle' })
  })

  it("shadcn's FieldError content: unique messages, one as text, several as a list", () => {
    expect(fieldErrorContent(undefined)).toBeNull()
    expect(fieldErrorContent([])).toBeNull()
    expect(fieldErrorContent(['Required', { message: 'Required' }])).toBe('Required')
    expect(fieldErrorContent([{ message: 'Too short' }, 'No digits'])).toEqual(['Too short', 'No digits'])
  })

  it('renders every part with its data-slot; the error drips in when it appears', async () => {
    const errors = ref<string[]>([])
    const App = defineComponent({
      setup: () => () =>
        h(GoopFieldSet, null, () => [
          h(GoopFieldLegend, null, () => 'Profile'),
          h(GoopFieldDescription, null, () => 'About you'),
          h(GoopFieldGroup, null, () => [
            h(GoopField, { 'data-invalid': errors.value.length ? 'true' : undefined, preset: 'subtle' }, () => [
              h(GoopFieldLabel, { for: 'name' }, () => 'Name'),
              h(GoopInput, { id: 'name', 'aria-invalid': errors.value.length ? 'true' : undefined }),
              h(GoopFieldError, { errors: errors.value }),
            ]),
            h(GoopFieldSeparator, null, () => 'Or'),
            h(GoopField, { orientation: 'horizontal' }, () => [h(GoopFieldContent, null, () => [h(GoopFieldTitle, null, () => 'Title')])]),
          ]),
        ]),
    })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    for (const slot of ['field-set', 'field-legend', 'field-description', 'field-group', 'field', 'field-label', 'field-separator', 'field-separator-content', 'field-content'])
      expect(document.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull()
    expect(document.querySelector('[data-slot="field"]')!.getAttribute('role')).toBe('group')
    expect(document.querySelector('[data-slot="field-error"]')).toBeNull()
    // The field's control keeps its own goo.
    expect(document.querySelector('[data-slot="input-goo"][data-goop-active]')).not.toBeNull()

    errors.value = ['Required']
    await nextTick()
    await flushPromises()
    const err = document.querySelector('[data-slot="field-error"]')!
    expect(err.getAttribute('role')).toBe('alert')
    expect(err.textContent!.trim()).toBe('Required')
    w.unmount()
  })
})

describe('hydration', () => {
  it('Tags Input and Field hydrate without mismatch, then the goo attaches', async () => {
    const App = {
      render: () =>
        h('div', [
          h(Tags),
          h(GoopField, { 'data-invalid': 'true' }, () => [
            h(GoopFieldLabel, { for: 'e' }, () => 'Email'),
            h(GoopInput, { id: 'e', 'aria-invalid': 'true' }),
            h(GoopFieldError, { errors: [{ message: 'Enter a valid email.' }] }),
          ]),
        ]),
    }
    const html = await renderToString(createSSRApp(App))
    expect(html).not.toContain('data-goop-part')
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
    expect(root.querySelector('[data-slot="tags-input-goo"][data-goop-active]')).not.toBeNull()
    expect(root.querySelector('[data-slot="field-error"]')!.textContent!.trim()).toBe('Enter a valid email.')
    app.unmount()
    expect(root.querySelector('[data-goop-part]')).toBeNull()
  })
})

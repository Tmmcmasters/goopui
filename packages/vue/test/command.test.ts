import { MENU_FEEL, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import {
  GoopCombobox,
  GoopComboboxAnchor,
  GoopComboboxEmpty,
  GoopComboboxGroup,
  GoopComboboxInput,
  GoopComboboxItem,
  GoopComboboxItemIndicator,
  GoopComboboxList,
  GoopComboboxTrigger,
  GoopCommand,
  GoopCommandDialog,
  GoopCommandEmpty,
  GoopCommandGroup,
  GoopCommandInput,
  GoopCommandItem,
  GoopCommandList,
  GoopCommandSeparator,
  GoopCommandShortcut,
  GoopPlugin,
  goopComponents,
  resolveCommandProps,
  toCommandOptions,
  resolveComboboxProps,
  toComboboxOptions,
} from '../src'

const COMMAND_PARTS = [
  'GoopCommand',
  'GoopCommandDialog',
  'GoopCommandEmpty',
  'GoopCommandGroup',
  'GoopCommandInput',
  'GoopCommandItem',
  'GoopCommandList',
  'GoopCommandSeparator',
  'GoopCommandShortcut',
]
const COMBOBOX_PARTS = [
  'GoopCombobox',
  'GoopComboboxAnchor',
  'GoopComboboxCancel',
  'GoopComboboxEmpty',
  'GoopComboboxGroup',
  'GoopComboboxInput',
  'GoopComboboxItem',
  'GoopComboboxItemIndicator',
  'GoopComboboxList',
  'GoopComboboxSeparator',
  'GoopComboboxTrigger',
]

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POP = Math.round(MENU_FEEL.playful.pop * 1000)

const CommandDemo = defineComponent({
  props: {
    goo: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    return () =>
      h(GoopCommand, { ...props.goo }, () => [
        h(GoopCommandInput, { placeholder: 'Type a command...' }),
        h(GoopCommandList, null, () => [
          h(GoopCommandEmpty, null, () => 'No results found.'),
          h(GoopCommandGroup, { heading: 'Suggestions' }, () => [
            h(GoopCommandItem, { value: 'calendar', id: 'calendar' }, () => 'Calendar'),
            h(GoopCommandItem, { value: 'emoji', id: 'emoji' }, () => 'Search Emoji'),
            h(GoopCommandItem, { value: 'calc', id: 'calc' }, () => 'Calculator'),
          ]),
          h(GoopCommandSeparator),
          h(GoopCommandGroup, { heading: 'Settings' }, () => [
            h(GoopCommandItem, { value: 'profile', id: 'profile' }, () => ['Profile', h(GoopCommandShortcut, null, () => '⌘P')]),
          ]),
        ]),
      ])
  },
})

const root = () => document.querySelector<HTMLElement>('[data-slot="command"]')!
const items = () => document.querySelector<HTMLElement>('[data-slot="command-list-items"]')!
const input = () => document.querySelector<HTMLInputElement>('[data-slot="command-input"]')!
const key = (k: string) => input().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopCommand', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of [...COMMAND_PARTS, ...COMBOBOX_PARTS]) expect(goopComponents).toContain(name)
  })

  it('renders a listbox with options, a search input and an aria-hidden goo highlight', async () => {
    const w = mount(CommandDemo, { attachTo: document.body })
    await flushPromises()
    expect(root()).not.toBeNull()
    expect(document.querySelector('[data-slot="command-list"]')!.getAttribute('role')).toBe('listbox')
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(4)
    expect(document.querySelectorAll('[role="group"]')).toHaveLength(2)
    expect(document.querySelector('[role="separator"]')).not.toBeNull()
    expect(input().tagName).toBe('INPUT')
    const blob = items().firstElementChild as HTMLElement
    expect(blob.getAttribute('data-goop')).toBe('highlight')
    expect(blob.getAttribute('aria-hidden')).toBe('true')
    // The blob draws the highlight: no flat bg on the items.
    expect(document.querySelector('#calendar')!.className).not.toContain('data-highlighted:bg-muted')
    // The input's goo ring layer.
    const host = document.querySelector('[data-slot="command-input-goo"]')!
    expect(host.hasAttribute('data-goop-active')).toBe(true)
    expect(host.querySelector('[data-goop-part="input"]')).not.toBeNull()
    w.unmount()
  })

  it('keyboard navigation moves the highlight blob between items', async () => {
    const w = mount(CommandDemo, { attachTo: document.body })
    await flushPromises()
    input().focus()
    key('ArrowDown')
    await wait(20)
    const first = document.querySelector('[role="option"][data-highlighted]')
    expect(first).not.toBeNull()
    key('ArrowDown')
    await wait(20)
    const second = document.querySelector('[role="option"][data-highlighted]')
    expect(second).not.toBe(first)
    // The blob follows the highlighted item.
    const blob = items().querySelector<HTMLElement>('[data-goop="highlight"]')!
    await wait(30)
    expect(blob.style.width).not.toBe('0px')
    w.unmount()
  })

  it('typing filters items and groups; nothing matching shows Empty', async () => {
    const w = mount(CommandDemo, { attachTo: document.body })
    await flushPromises()
    await w.findComponent(GoopCommandInput).find('input').setValue('calc')
    await flushPromises()
    const ids = [...document.querySelectorAll('[role="option"]')].map((e) => e.id)
    expect(ids).toEqual(['calc'])
    expect(document.querySelectorAll('[role="group"]:not([hidden])')).toHaveLength(1)
    await w.findComponent(GoopCommandInput).find('input').setValue('zzz')
    await flushPromises()
    expect(document.querySelector('[data-slot="command-empty"]')?.textContent).toBe('No results found.')
    w.unmount()
  })

  it('choosing an item plays the pop', async () => {
    const w = mount(CommandDemo, { attachTo: document.body })
    await flushPromises()
    document.querySelector<HTMLElement>('#emoji')!.click()
    await flushPromises()
    expect(activeTickerCount()).toBeGreaterThan(0)
    await wait(POP + 300)
    w.unmount()
  })

  it('toggles off: :highlight="false" uses the flat bg, :ring="false" drops the ring, :goo="false" is plain', async () => {
    let w = mount(CommandDemo, { props: { goo: { highlight: false, ring: false } }, attachTo: document.body })
    await flushPromises()
    expect(items().querySelector('[data-goop="highlight"]')).toBeNull()
    expect(document.querySelector('#calendar')!.className).toContain('data-highlighted:bg-muted')
    expect(document.querySelector('[data-slot="command-input-goo"]')!.hasAttribute('data-goop-active')).toBe(false)
    w.unmount()
    w = mount(CommandDemo, { props: { goo: { goo: false } }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-goop]')).toBeNull()
    w.unmount()
  })

  it('reduced motion: the blob snaps (nothing ticks), the ring is static', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(CommandDemo, { attachTo: document.body })
    await flushPromises()
    input().focus()
    key('ArrowDown')
    await wait(20)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(CommandDemo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    input().focus()
    key('ArrowDown')
    await wait(20)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('props resolve to on and map to core options', () => {
    const on = toCommandOptions(resolveCommandProps({}))
    expect(on.highlight).toMatchObject({ wobble: true, momentum: true, pop: true, followPointer: true })
    expect(on.ring).not.toBeNull()
    const off = toCommandOptions(resolveCommandProps({ goo: false }))
    expect(off).toEqual({ highlight: null, ring: null })
    expect(toCommandOptions(resolveCommandProps({ wobble: false })).ring).toMatchObject({ wobble: false })
    expect(toCommandOptions(resolveCommandProps({ momentum: false })).highlight).toMatchObject({ momentum: false })
  })
})

describe('GoopCommandDialog', () => {
  it('opens a dialog that blooms, with the command inside', async () => {
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(GoopCommandDialog, { open: true }, () => [
            h(GoopCommandInput),
            h(GoopCommandList, null, () => [h(GoopCommandItem, { value: 'a', id: 'a' }, () => 'A')]),
          ]),
      }),
      { attachTo: document.body },
    )
    await flushPromises()
    const content = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!
    expect(content.getAttribute('role')).toBe('dialog')
    expect(content.hasAttribute('data-goop-emerge')).toBe(true)
    expect(content.querySelector('[data-slot="command"]')).not.toBeNull()
    expect(content.textContent).toContain('Command Palette')
    w.unmount()
  })
})

const ComboDemo = defineComponent({
  props: {
    list: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const value = ref<string>()
    const open = ref(true)
    return () =>
      h(
        GoopCombobox,
        { modelValue: value.value, 'onUpdate:modelValue': (v: unknown) => (value.value = v as string), open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) },
        () => [
          h(GoopComboboxAnchor, null, () => [h(GoopComboboxInput, { placeholder: 'Framework' }), h(GoopComboboxTrigger, null, () => 'v')]),
          h(GoopComboboxList, { ...props.list }, () => [
            h(GoopComboboxEmpty, null, () => 'Nothing'),
            h(GoopComboboxGroup, { heading: 'Frameworks' }, () =>
              ['nuxt', 'vue', 'svelte'].map((v) =>
                h(GoopComboboxItem, { value: v, id: v }, () => [v, h(GoopComboboxItemIndicator)]),
              ),
            ),
          ]),
        ],
      )
  },
})

describe('GoopCombobox', () => {
  it('renders a combobox input and a blooming listbox with a goo highlight', async () => {
    const w = mount(ComboDemo, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-slot="combobox-input"]')!.getAttribute('role')).toBe('combobox')
    const list = document.querySelector<HTMLElement>('[data-slot="combobox-list"]')!
    expect(list.hasAttribute('data-goop-emerge')).toBe(true)
    expect(list.closest('[role="listbox"]') ?? list.querySelector('[role="listbox"]')).not.toBeNull()
    expect(list.querySelectorAll('[role="option"]')).toHaveLength(3)
    expect(list.querySelector('[data-slot="combobox-items"] > [data-goop="highlight"]')).not.toBeNull()
    w.unmount()
  })

  it('the trigger defaults to a size-4 chevron in a tappable box; slot content replaces it', async () => {
    const Bare = defineComponent(() => () =>
      h(GoopCombobox, null, () => [h(GoopComboboxAnchor, null, () => [h(GoopComboboxInput), h(GoopComboboxTrigger, { class: 'absolute right-0' })])]),
    )
    const w = mount(Bare, { attachTo: document.body })
    await flushPromises()
    const t = document.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!
    expect(t.querySelector('svg')).not.toBeNull()
    expect(t.className).toContain('min-w-8')
    expect(t.className).toContain('min-h-6')
    expect(t.className).toContain('absolute right-0')
    w.unmount()
    const c = mount(ComboDemo, { attachTo: document.body })
    await flushPromises()
    const custom = document.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!
    expect(custom.querySelector('svg')).toBeNull()
    expect(custom.textContent).toBe('v')
    c.unmount()
  })

  it('choosing pops the blob, sets the value, then closes', async () => {
    const w = mount(ComboDemo, { attachTo: document.body })
    await flushPromises()
    document.querySelector<HTMLElement>('#vue')!.click()
    await flushPromises()
    expect(document.querySelector('#vue [data-slot="combobox-item-indicator"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="combobox-list"]')!.getAttribute('data-state')).toBe('open')
    await wait(POP + 60)
    await flushPromises()
    expect(document.querySelector('[data-slot="combobox-list"]')?.getAttribute('data-state') ?? 'closed').toBe('closed')
    w.unmount()
  })

  it(':goo="false" is a plain shadcn list', async () => {
    const w = mount(ComboDemo, { props: { list: { goo: false } }, attachTo: document.body })
    await flushPromises()
    const list = document.querySelector<HTMLElement>('[data-slot="combobox-list"]')!
    expect(list.hasAttribute('data-goop-emerge')).toBe(false)
    expect(list.className).toContain('bg-popover')
    w.unmount()
  })

  it('props map like the select list, blooming from the center', () => {
    const o = toComboboxOptions(resolveComboboxProps({}))
    expect(o.highlight).not.toBeNull()
    expect(o.plop).not.toBeNull()
    expect(resolveComboboxProps({}).bloomFrom).toBe('center')
    expect(toComboboxOptions(resolveComboboxProps({ plop: false, highlight: false })).plop).toBeNull()
  })
})

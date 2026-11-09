import { MENU_FEEL, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, ref, type PropType } from 'vue'
import { renderToString } from 'vue/server-renderer'
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
    // Decorative: a listbox may only own groups and options.
    expect(document.querySelector('[data-slot="command-separator"]')!.getAttribute('role')).toBe('none')
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

// The parent filters and orders its own results (fuzzy-ish: every letter in order, ranked
// by how early the first letter lands), like the docs search.
const ALL = ['Slider', 'Select', 'Sheet', 'Dialog', 'Drawer']
const rank = (q: string) =>
  ALL.map((label) => {
    let i = -1
    for (const c of q.toLowerCase()) {
      i = label.toLowerCase().indexOf(c, i + 1)
      if (i < 0) return null
    }
    return { label, score: label.toLowerCase().indexOf(q.toLowerCase()[0] ?? '') }
  })
    .filter((x): x is { label: string; score: number } => !!x)
    .sort((a, b) => a.score - b.score || b.label.localeCompare(a.label))
    .map((x) => x.label)

const selected: string[] = []
const OwnFilterDemo = defineComponent({
  props: { ignoreFilter: { type: Boolean, default: true } },
  setup(props) {
    const query = ref('')
    return () =>
      h(GoopCommand, { ignoreFilter: props.ignoreFilter }, () => [
        h(GoopCommandInput, { modelValue: query.value, 'onUpdate:modelValue': (v: string) => (query.value = v) }),
        h(GoopCommandList, null, () => [
          h(GoopCommandEmpty, null, () => 'Nothing'),
          rank(query.value).length
            ? h(GoopCommandGroup, { heading: 'Components' }, () =>
                rank(query.value).map((label) =>
                  h(GoopCommandItem, { key: label, value: label, id: label, onSelect: () => selected.push(label) }, () => label),
                ),
              )
            : null,
        ]),
      ])
  },
})
const optionIds = () => [...document.querySelectorAll('[role="option"]')].map((e) => e.id)
const highlighted = () => document.querySelector('[role="option"][data-highlighted]')?.id

describe('GoopCommand ignoreFilter', () => {
  it('renders every item as given: fuzzy matches survive, in the parent\'s order', async () => {
    const w = mount(OwnFilterDemo, { attachTo: document.body })
    await flushPromises()
    expect(optionIds()).toEqual(rank(''))
    await w.find('input').setValue('sldr')
    await flushPromises()
    // The built-in "contains" filter would hide Slider ("sldr" isn't a substring).
    expect(optionIds()).toEqual(['Slider'])
    expect(document.querySelectorAll('[role="group"]:not([hidden])')).toHaveLength(1)
    expect(document.querySelector('[data-slot="command-empty"]')).toBeNull()
    await w.find('input').setValue('d')
    await flushPromises()
    expect(optionIds()).toEqual(['Drawer', 'Dialog', 'Slider'])
    w.unmount()
  })

  it('highlights the first result after each query change; arrows and Enter follow the given order', async () => {
    selected.length = 0
    const w = mount(OwnFilterDemo, { attachTo: document.body })
    await flushPromises()
    input().focus()
    await w.find('input').setValue('s')
    await wait(20)
    expect(highlighted()).toBe(rank('s')[0])
    key('ArrowDown')
    await wait(20)
    expect(highlighted()).toBe(rank('s')[1])
    await w.find('input').setValue('d')
    await wait(20)
    expect(highlighted()).toBe('Drawer')
    key('ArrowDown')
    await wait(20)
    expect(highlighted()).toBe('Dialog')
    // The blob sits on the highlighted item.
    const blob = items().querySelector<HTMLElement>('[data-goop="highlight"]')!
    await wait(30)
    expect(blob.style.width).not.toBe('0px')
    key('Enter')
    await flushPromises()
    expect(selected).toEqual(['Dialog'])
    w.unmount()
  })

  it('re-highlights the first item when results that replace the highlighted one land later', async () => {
    const list = ref(['A', 'B'])
    const Late = defineComponent(() => () =>
      h(GoopCommand, { ignoreFilter: true }, () => [
        h(GoopCommandInput),
        h(GoopCommandList, null, () => list.value.map((v) => h(GoopCommandItem, { key: v, value: v, id: v }, () => v))),
      ]),
    )
    const w = mount(Late, { attachTo: document.body })
    await flushPromises()
    input().focus()
    key('ArrowDown')
    await wait(20)
    expect(['A', 'B']).toContain(highlighted())
    list.value = ['C', 'D']
    await wait(30)
    expect(highlighted()).toBe('C')
    w.unmount()
  })

  it('Empty shows only when there are no items', async () => {
    const w = mount(OwnFilterDemo, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-slot="command-empty"]')).toBeNull()
    await w.find('input').setValue('zzz')
    await flushPromises()
    expect(optionIds()).toEqual([])
    expect(document.querySelector('[data-slot="command-empty"]')?.textContent).toBe('Nothing')
    await w.find('input').setValue('sh')
    await flushPromises()
    expect(document.querySelector('[data-slot="command-empty"]')).toBeNull()
    w.unmount()
  })

  it('defaults off: the built-in filter still hides non-matching items', async () => {
    const w = mount(OwnFilterDemo, { props: { ignoreFilter: false }, attachTo: document.body })
    await flushPromises()
    await w.find('input').setValue('sldr')
    await flushPromises()
    // The parent still renders Slider, but "sldr" isn't contained in it.
    expect(optionIds()).toEqual([])
    expect(document.querySelector('[data-slot="command-empty"]')?.textContent).toBe('Nothing')
    expect(root().hasAttribute('ignorefilter')).toBe(false)
    w.unmount()
  })

  it('hydrates server markup without mismatch; Empty appears after mount when there are no items', async () => {
    for (const labels of [['Slider', 'Select'], []]) {
      const App = {
        render: () =>
          h(GoopCommand, { ignoreFilter: true }, () => [
            h(GoopCommandInput),
            h(GoopCommandList, null, () => [
              h(GoopCommandEmpty, null, () => 'Nothing'),
              h(GoopCommandGroup, { heading: 'Components' }, () => labels.map((v) => h(GoopCommandItem, { key: v, value: v }, () => v))),
            ]),
          ]),
      }
      const html = await renderToString(createSSRApp(App))
      const el = document.createElement('div')
      el.innerHTML = html
      document.body.append(el)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const app = createSSRApp(App)
      app.mount(el)
      await flushPromises()
      const messages = [...warn.mock.calls, ...error.mock.calls].map((c) => String(c[0]))
      warn.mockRestore()
      error.mockRestore()
      expect(messages.filter((m) => /hydration|mismatch/i.test(m))).toEqual([])
      expect(el.querySelectorAll('[role="option"]')).toHaveLength(labels.length)
      expect(!!el.querySelector('[data-slot="command-empty"]')).toBe(labels.length === 0)
      app.unmount()
      el.remove()
    }
  })

  it('GoopCommandDialog passes ignoreFilter through', async () => {
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(GoopCommandDialog, { open: true, ignoreFilter: true }, () => [
            h(GoopCommandInput),
            h(GoopCommandList, null, () => [h(GoopCommandItem, { value: 'a', id: 'a' }, () => 'Alpha')]),
          ]),
      }),
      { attachTo: document.body },
    )
    await flushPromises()
    await w.findComponent(GoopCommandInput).find('input').setValue('zzz')
    await flushPromises()
    expect(optionIds()).toEqual(['a'])
    w.unmount()
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

import { MENU_FEEL, MENU_HIGHLIGHT_CIRCLES, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import {
  GoopPlugin,
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
  resolveSelectProps,
  toSelectOptions,
} from '../src'

const PARTS = [
  'GoopSelect',
  'GoopSelectTrigger',
  'GoopSelectValue',
  'GoopSelectContent',
  'GoopSelectGroup',
  'GoopSelectLabel',
  'GoopSelectItem',
  'GoopSelectItemText',
  'GoopSelectSeparator',
  'GoopSelectScrollUpButton',
  'GoopSelectScrollDownButton',
]

const Demo = defineComponent({
  props: {
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    onPick: { type: Function as PropType<(e: Event) => void>, default: undefined },
    multiple: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref(true)
    const value = ref<unknown>(props.multiple ? ['apple'] : 'apple')
    return { open, value, props }
  },
  render() {
    const p = this.props
    return h(
      GoopSelect,
      {
        open: this.open,
        'onUpdate:open': (v: boolean) => (this.open = v),
        modelValue: this.value as string,
        'onUpdate:modelValue': (v: unknown) => (this.value = v),
        multiple: p.multiple,
      },
      () => [
        h(GoopSelectTrigger, { class: 'w-44' }, () => h(GoopSelectValue, { placeholder: 'Pick a fruit' })),
        h(GoopSelectContent, { ...p.content }, () => [
          h(GoopSelectGroup, null, () => [
            h(GoopSelectLabel, null, () => 'Fruits'),
            h(GoopSelectItem, { id: 'apple', value: 'apple' }, () => 'Apple'),
            h(GoopSelectItem, { id: 'banana', value: 'banana', onSelect: p.onPick }, () => 'Banana'),
            h(GoopSelectItem, { id: 'grape', value: 'grape', disabled: true }, () => 'Grape'),
          ]),
          h(GoopSelectSeparator),
          h(GoopSelectItem, { id: 'kiwi', value: 'kiwi' }, () => 'Kiwi'),
        ]),
      ],
    )
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="select-content"]')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POP = Math.round(MENU_FEEL.playful.pop * 1000)
type Vm = { open: boolean; value: unknown }
/** reka selects on pointerup (and Enter/Space). */
const choose = (id: string) => {
  const el = content()!.querySelector<HTMLElement>(`#${id}`)!
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }))
}

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopSelect', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of PARTS) expect(goopComponents).toContain(name)
  })

  it('renders the listbox over an aria-hidden emerge surface, with a goo highlight in the list', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('role')).toBe('listbox')
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    const list = el.querySelector<HTMLElement>('[data-slot="select-list"]')!
    const blob = list.firstElementChild as HTMLElement
    expect(blob.getAttribute('data-goop')).toBe('highlight')
    expect(blob.querySelectorAll('[data-goop="blob"]')).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    expect(el.querySelectorAll('[role="option"]')).toHaveLength(4)
    expect(el.querySelector('[data-slot="select-label"]')!.textContent).toBe('Fruits')
    expect(el.querySelector('[data-slot="select-separator"]')).not.toBeNull()
    for (const item of el.querySelectorAll('[role="option"]')) {
      expect(item.className.split(' ')).not.toContain('focus:bg-accent')
    }
    // The goo paints the panel; reka's viewport scrolls; the list clips the blob (064bd98).
    for (const c of ['bg-popover', 'ring-1', 'shadow-md', 'overflow-y-auto']) expect(el.className.split(' ')).not.toContain(c)
    const viewport = list.parentElement!
    expect(viewport.hasAttribute('data-reka-select-viewport')).toBe(true)
    expect(list.className.split(' ')).toContain('overflow-clip')
    // shadcn's padding sits on the groups.
    expect(el.querySelector('[data-slot="select-group"]')!.className.split(' ')).toContain('p-1')
    // Default position is shadcn's: item-aligned (the list lies over the trigger).
    expect(el.getAttribute('data-align-trigger')).toBe('true')
    expect(list.className).not.toMatch(/overflow-(auto|hidden|scroll)|overflow-[xy]-/)
    // Select's panel defaults to the popover color, not the (outlined) trigger's.
    expect(el.hasAttribute('data-goop-tint')).toBe(false)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('the blob follows the highlighted option', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const handle = w.findComponent(GoopSelectContent).vm.highlight!
    const kiwi = content()!.querySelector('#kiwi')!
    // reka focuses (highlights) the selected option on open.
    content()!.querySelector('#apple')!.removeAttribute('data-highlighted')
    kiwi.setAttribute('data-highlighted', '')
    await wait(0)
    expect(handle.target).toBe(kiwi)
    w.unmount()
  })

  it('choosing pops the blob, sets the value at once, plops the check, then closes', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    choose('banana')
    await flushPromises()
    const vm = w.vm as unknown as Vm
    expect(vm.value).toBe('banana')
    expect(vm.open).toBe(true)
    const mark = content()!.querySelector<HTMLElement>('#banana [data-slot="select-item-indicator-mark"]')!
    expect(mark).not.toBeNull()
    expect(mark.getAnimations().length).toBeGreaterThan(0)
    await wait(POP + 30)
    expect(vm.open).toBe(false)
    w.unmount()
  })

  it('opening on a selected item does not plop its check', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const mark = content()!.querySelector<HTMLElement>('#apple [data-slot="select-item-indicator-mark"]')!
    expect(mark).not.toBeNull()
    expect(mark.getAnimations()).toHaveLength(0)
    w.unmount()
  })

  it(':plop="false" shows the check without the plop', async () => {
    const w = mount(Demo, { props: { content: { plop: false } }, attachTo: document.body })
    await flushPromises()
    choose('banana')
    await flushPromises()
    const mark = content()!.querySelector<HTMLElement>('#banana [data-slot="select-item-indicator-mark"]')!
    expect(mark.getAnimations()).toHaveLength(0)
    w.unmount()
  })

  it("a consumer's preventDefault cancels the choice", async () => {
    const w = mount(Demo, { props: { onPick: (e: Event) => e.preventDefault() }, attachTo: document.body })
    await flushPromises()
    choose('banana')
    await wait(POP + 30)
    const vm = w.vm as unknown as Vm
    expect(vm.value).toBe('apple')
    expect(vm.open).toBe(true)
    w.unmount()
  })

  it('multiple: choosing toggles the value and keeps the list open', async () => {
    const w = mount(Demo, { props: { multiple: true }, attachTo: document.body })
    await flushPromises()
    choose('kiwi')
    await wait(POP + 30)
    const vm = w.vm as unknown as Vm
    expect(vm.value).toEqual(['apple', 'kiwi'])
    expect(vm.open).toBe(true)
    w.unmount()
  })

  it(':pop="false" leaves choosing to reka (sets and closes right away)', async () => {
    const w = mount(Demo, { props: { content: { pop: false } }, attachTo: document.body })
    await flushPromises()
    choose('kiwi')
    await flushPromises()
    const vm = w.vm as unknown as Vm
    expect(vm.value).toBe('kiwi')
    expect(vm.open).toBe(false)
    w.unmount()
  })

  it(':goo="false" is exactly shadcn', async () => {
    const w = mount(Demo, { props: { content: { goo: false } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-popover', 'ring-1', 'shadow-md', 'overflow-y-auto']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.querySelector('[data-slot="select-list"]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    expect(el.querySelector('#kiwi')!.className.split(' ')).toContain('focus:bg-accent')
    w.unmount()
  })

  it(':highlight="false" keeps the goo panel but shadcn\'s flat highlight', async () => {
    const w = mount(Demo, { props: { content: { highlight: false } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.querySelector('[data-goop="surface"]')).not.toBeNull()
    expect(el.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(el.querySelector('#kiwi')!.className.split(' ')).toContain('focus:bg-accent')
    w.unmount()
  })

  it('popper: offset classes and a floating wrapper, still a goo panel', async () => {
    const w = mount(Demo, { props: { content: { position: 'popper' } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    expect(el.className).toContain('data-[side=bottom]:translate-y-1')
    expect(el.getAttribute('data-align-trigger')).toBe('false')
    expect(el.parentElement!.hasAttribute('data-reka-popper-content-wrapper')).toBe(true)
    w.unmount()
  })

  it('reduced motion: opens at rest, nothing ticks, choosing closes at once without a plop', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(activeTickerCount()).toBe(0)
    choose('kiwi')
    await flushPromises()
    const vm = w.vm as unknown as Vm
    expect(vm.value).toBe('kiwi')
    expect(vm.open).toBe(false)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    expect(content()!.getAttribute('data-goop-emerge')).toBe('open')
    w.unmount()
  })
})

describe('select props', () => {
  it('resolve to on with select defaults and map to core options', () => {
    const r = resolveSelectProps({ wobble: false, speed: 2 })
    expect(r).toMatchObject({ goo: true, highlight: true, pop: true, plop: true, wobble: false, speed: 2 })
    expect(r).toMatchObject({ flowStyle: 'bloom', bloomFrom: 'auto', surface: 'popover' })
    const opts = toSelectOptions(r, { preset: 'subtle' })
    expect(opts.emerge).toMatchObject({ wobble: false, preset: 'subtle', speed: 2, surfaceColor: 'popover', flowStyle: 'bloom' })
    expect(opts.highlight).toMatchObject({ wobble: false, pop: true })
    expect(opts.plop).toMatchObject({ wobble: false, preset: 'subtle', speed: 2 })
    expect(toSelectOptions(resolveSelectProps({ plop: false })).plop).toBeNull()
    expect(toSelectOptions(resolveSelectProps({ highlight: false })).highlight).toBeNull()
    expect(toSelectOptions(resolveSelectProps({ goo: false })).plop).toBeNull()
  })

  it('every listed key is a GoopSelectContent prop', () => {
    const props = (GoopSelectContent as unknown as { props: Record<string, unknown> }).props
    for (const k of SELECT_PROP_KEYS) expect(props).toHaveProperty(k)
  })
})

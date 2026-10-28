import { MENU_HIGHLIGHT_CIRCLES, TABS_FEEL, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import { GoopPlugin, GoopTabs, GoopTabsContent, GoopTabsList, GoopTabsTrigger, goopComponents, toTabsOptions } from '../src'

const Demo = defineComponent({
  props: {
    list: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const tab = ref('account')
    return () =>
      h(GoopTabs, { modelValue: tab.value, 'onUpdate:modelValue': (v: string | number) => (tab.value = String(v)) }, () => [
        h(GoopTabsList, props.list, () => [
          h(GoopTabsTrigger, { value: 'account' }, () => 'Account'),
          h(GoopTabsTrigger, { value: 'password', class: 'px-4' }, () => 'Password'),
        ]),
        h(GoopTabsContent, { value: 'account' }, () => 'Account body'),
        h(GoopTabsContent, { value: 'password' }, () => 'Password body'),
      ])
  },
})

const list = () => document.querySelector<HTMLElement>('[data-slot="tabs-list"]')!
const triggers = () => [...document.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]')]
const blob = () => list().querySelector<HTMLElement>(':scope > [data-goop="highlight"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopTabs', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of ['GoopTabs', 'GoopTabsList', 'GoopTabsTrigger', 'GoopTabsContent']) expect(goopComponents).toContain(name)
  })

  it('renders shadcn parts with an aria-hidden goo blob behind the triggers', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-slot="tabs"]')!.getAttribute('data-orientation')).toBe('horizontal')
    expect(list().getAttribute('role')).toBe('tablist')
    expect(list().hasAttribute('data-goop-tabs')).toBe(true)
    const el = blob()!
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelectorAll('[data-goop="blob"]')).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    expect(triggers().map((t) => t.getAttribute('role'))).toEqual(['tab', 'tab'])
    expect(document.querySelector('[data-slot="tabs-content"]')!.textContent).toBe('Account body')
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('the blob paints the active bg: triggers drop it; class passthrough merges', async () => {
    const w = mount(Demo, { props: { list: { class: 'w-full' } }, attachTo: document.body })
    await flushPromises()
    expect(list().className).toContain('w-full')
    expect(list().className).toContain('bg-muted')
    const [, pw] = triggers()
    expect(pw!.className.split(' ')).toContain('px-4')
    expect(pw!.className.split(' ')).not.toContain('px-1.5')
    for (const t of triggers()) {
      expect(t.className).not.toContain('data-[state=active]:bg-background')
      expect(t.className).toContain('data-[state=active]:text-foreground')
    }
    w.unmount()
  })

  it('orientation classes target data-orientation (reka never sets data-horizontal/vertical)', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const root = document.querySelector<HTMLElement>('[data-slot="tabs"]')!
    expect(root.getAttribute('data-orientation')).toBe('horizontal')
    expect(root.className).toContain('data-[orientation=horizontal]:flex-col')
    expect(list().className).toContain('group-data-[orientation=vertical]/tabs:flex-col')
    expect(list().className).toContain('group-data-[orientation=horizontal]/tabs:h-8')
    expect(triggers()[0]!.className).toContain('group-data-[orientation=vertical]/tabs:w-full')
    for (const el of [root, list(), ...triggers()]) expect(el.className).not.toMatch(/(?<![\w\]-])(group-)?data-(horizontal|vertical|active)\b/)
    w.unmount()
  })

  it('follows the active tab (click / keyboard both flip data-state)', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const handle = (w.findComponent(GoopTabsList).vm as unknown as { handle: { target: Element | null } }).handle
    expect(handle.target).toBe(triggers()[0])
    // reka activates on mousedown.
    await w.findAll('[data-slot="tabs-trigger"]')[1]!.trigger('mousedown', { button: 0 })
    await flushPromises()
    await new Promise((r) => setTimeout(r, 0))
    expect(triggers()[1]!.getAttribute('data-state')).toBe('active')
    expect(handle.target).toBe(triggers()[1])
    w.unmount()
  })

  it(':goo="false" / :indicator="false" / variant line are exactly shadcn', async () => {
    for (const props of [{ goo: false }, { indicator: false }, { variant: 'line' }]) {
      const w = mount(Demo, { props: { list: props }, attachTo: document.body })
      await flushPromises()
      expect(blob()).toBeNull()
      expect(list().hasAttribute('data-goop-tabs')).toBe(false)
      for (const t of triggers()) expect(t.className).toContain('data-[state=active]:bg-background')
      w.unmount()
    }
  })

  it('reduced motion: blob snaps, nothing ticks', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    expect(blob()).not.toBeNull()
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('maps props to core options', () => {
    expect(toTabsOptions({ goo: false })).toBeNull()
    expect(toTabsOptions({ indicator: false })).toBeNull()
    const o = toTabsOptions({ momentum: false, preset: 'wild' }, { renderer: 'canvas' })!
    expect(o).toMatchObject({ feel: TABS_FEEL, wobble: true, momentum: false, preset: 'wild', renderer: 'canvas', speed: 1 })
  })
})

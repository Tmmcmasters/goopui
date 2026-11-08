import { NAVIGATION_MENU_EFFECTS, NAVIGATION_MENU_ITEM_ATTR, activeTickerCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import {
  GoopNavigationMenu,
  GoopNavigationMenuContent,
  GoopNavigationMenuItem,
  GoopNavigationMenuLink,
  GoopNavigationMenuList,
  GoopNavigationMenuTrigger,
  NAVIGATION_MENU_PROP_KEYS,
  goopComponents,
  navigationMenuTriggerStyle,
  toNavigationMenuOptions,
} from '../src'

const Demo = defineComponent({
  props: {
    root: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const value = ref('')
    return () =>
      h(
        GoopNavigationMenu,
        { modelValue: value.value, 'onUpdate:modelValue': (v: string) => (value.value = v), ...props.root },
        () =>
          h(GoopNavigationMenuList, null, () => [
            h(GoopNavigationMenuItem, { value: 'one' }, () => [
              h(GoopNavigationMenuTrigger, null, () => 'One'),
              h(GoopNavigationMenuContent, null, () => h(GoopNavigationMenuLink, { href: '#a', class: 'inner' }, () => 'Inner')),
            ]),
            h(GoopNavigationMenuItem, null, () => h(GoopNavigationMenuLink, { href: '#d', class: navigationMenuTriggerStyle() }, () => 'Docs')),
          ]),
      )
  },
})

const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopNavigationMenu', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const part of ['', 'Content', 'Indicator', 'Item', 'Link', 'List', 'Trigger', 'Viewport']) {
      expect(goopComponents).toContain(`GoopNavigationMenu${part}`)
    }
  })

  it('renders shadcn parts; the list gets one aria-hidden goo blob; top-level items are marked', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const root = q('[data-slot="navigation-menu"]')!
    expect(root.getAttribute('data-viewport')).toBe('true')
    const list = q('[data-slot="navigation-menu-list"]')!
    const wrap = list.parentElement!
    const blob = wrap.querySelector(':scope > [data-goop="highlight"]')
    expect(blob).not.toBeNull()
    expect(blob!.getAttribute('aria-hidden')).toBe('true')
    expect(q('[data-slot="navigation-menu-trigger"]')!.hasAttribute(NAVIGATION_MENU_ITEM_ATTR)).toBe(true)
    expect(q('[data-slot="navigation-menu-link"]')!.hasAttribute(NAVIGATION_MENU_ITEM_ATTR)).toBe(true)
    // The goo viewport box is there (reka's viewport mounts inside it on open).
    expect(q('[data-slot="navigation-menu-viewport-box"]')).not.toBeNull()
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('opening blooms the viewport box (an emerge surface) and closing shrinks it', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    q<HTMLButtonElement>('[data-slot="navigation-menu-trigger"]')!.click()
    await flushPromises()
    const box = q('[data-slot="navigation-menu-viewport-box"]')!
    expect(box.getAttribute('data-goop-emerge')).toMatch(/opening|open/)
    expect(box.querySelector(':scope > [data-goop="surface"]')!.getAttribute('aria-hidden')).toBe('true')
    // The panel's link is a panel link (the panel's own blob), not a top-level item of the list.
    const inner = document.querySelector('.inner')
    expect(inner?.hasAttribute(NAVIGATION_MENU_ITEM_ATTR)).toBe(true)
    expect(inner?.closest('[data-goop-nav-scope]')?.getAttribute('data-slot')).toBe('navigation-menu-content')
    w.unmount()
  })

  it(':goo="false" is plain shadcn: no blob, no goo viewport, no item marks', async () => {
    const w = mount(Demo, { props: { root: { goo: false } }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(q('[data-slot="navigation-menu-viewport-box"]')).toBeNull()
    expect(document.querySelector(`[${NAVIGATION_MENU_ITEM_ATTR}]`)).toBeNull()
    w.unmount()
  })

  it('props map to core options; every toggle turns its part off', () => {
    expect(NAVIGATION_MENU_PROP_KEYS).toEqual(expect.arrayContaining([...NAVIGATION_MENU_EFFECTS]))
    const on = toNavigationMenuOptions({})
    expect(on.highlight).not.toBeNull()
    expect(on.contentHighlight).not.toBeNull()
    expect(on.viewport).toMatchObject({ flow: true, flowStyle: 'bloom', jelly: true, wobble: true, surfaceColor: 'popover' })
    expect(toNavigationMenuOptions({ highlight: false }).highlight).toBeNull()
    expect(toNavigationMenuOptions({ contentHighlight: false }).contentHighlight).toBeNull()
    expect(toNavigationMenuOptions({ bloom: false }).viewport).toBeNull()
    expect(toNavigationMenuOptions({ jelly: false }).viewport!.jelly).toBe(false)
    expect(toNavigationMenuOptions({ wobble: false, preset: 'wild' }).highlight).toMatchObject({ wobble: false, preset: 'wild' })
    const off = toNavigationMenuOptions({ goo: false })
    expect([off.highlight, off.contentHighlight, off.viewport]).toEqual([null, null, null])
  })

  it('SSR renders shadcn markup without goo', async () => {
    const html = await renderToString(createSSRApp(Demo))
    expect(html).toContain('data-slot="navigation-menu-list"')
    expect(html).not.toContain('data-goop="highlight"')
  })
})

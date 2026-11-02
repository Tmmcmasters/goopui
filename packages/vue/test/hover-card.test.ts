import { activeTickerCount, isLoopRunning, type EmergeOptions } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, watch, type PropType } from 'vue'

// Pass-through spy on attachEmerge, so tests can read the options the card attached with.
const attached = vi.hoisted(() => [] as { host: HTMLElement; opts: EmergeOptions }[])
vi.mock('@goopui/core', async (orig) => {
  const core = await orig<typeof import('@goopui/core')>()
  return {
    ...core,
    attachEmerge: (host: HTMLElement, opts: EmergeOptions) => {
      attached.push({ host, opts })
      return core.attachEmerge(host, opts)
    },
  }
})

import { GoopHoverCard, GoopHoverCardContent, GoopHoverCardTrigger, GoopPlugin, goopComponents, toHoverCardOptions } from '../src'

const Demo = defineComponent({
  props: {
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const open = ref(props.open)
    watch(() => props.open, (v) => (open.value = v))
    return () =>
      h(GoopHoverCard, { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) }, () => [
        h(GoopHoverCardTrigger, { href: '#vue' }, () => '@vuejs'),
        h(GoopHoverCardContent, { ...props.content }, () => h('div', { id: 'body' }, 'The Progressive JavaScript Framework.')),
      ])
  },
})

const content = () => document.querySelector<HTMLElement>('[data-slot="hover-card-content"]')
const trigger = () => document.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]')
const origin = (host: HTMLElement | null) => {
  const o = [...attached].reverse().find((a) => a.host === host)?.opts.bloomOrigin
  return typeof o === 'function' ? o() : o
}

afterEach(() => {
  document.body.innerHTML = ''
  attached.length = 0
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopHoverCard', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of ['GoopHoverCard', 'GoopHoverCardTrigger', 'GoopHoverCardContent']) expect(goopComponents).toContain(name)
  })

  it('renders a link trigger and real content over an aria-hidden goo surface', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(trigger()!.tagName).toBe('A')
    expect(trigger()!.getAttribute('href')).toBe('#vue')
    const el = content()!
    expect(el.hasAttribute('data-goop-emerge')).toBe(true)
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelector('#body')!.textContent).toContain('Progressive')
    // The goo paints the background, ring and shadow.
    for (const c of ['bg-popover', 'ring-1', 'shadow-md']) expect(el.className.split(' ')).not.toContain(c)
    expect(el.className.split(' ')).toContain('w-64')
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('blooms from the trigger (its edge facing it); bloomFrom="center" from the center', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(origin(content())).toBe(trigger())
    const opts = [...attached].reverse().find((a) => a.host === content())!.opts
    expect(opts).toMatchObject({ flow: true, flowStyle: 'bloom', surfaceColor: 'popover' })
    w.unmount()
    const c = mount(Demo, { props: { content: { bloomFrom: 'center' } }, attachTo: document.body })
    await flushPromises()
    expect(origin(content())).toBeNull()
    c.unmount()
  })

  it('class passthrough merges onto the card', async () => {
    const w = mount(Demo, { props: { content: { class: 'w-80' } }, attachTo: document.body })
    await flushPromises()
    expect(content()!.className.split(' ')).toContain('w-80')
    expect(content()!.className.split(' ')).not.toContain('w-64')
    w.unmount()
  })

  it(':goo="false" is exactly shadcn HoverCardContent', async () => {
    const w = mount(Demo, { props: { content: { goo: false } }, attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-popover', 'ring-1', 'shadow-md', 'w-64']))
    expect(el.querySelector('[data-goop]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    w.unmount()
  })

  it('plays the close when the root closes', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    const seen: string[] = []
    const mo = new MutationObserver(() => {
      const s = el.getAttribute('data-goop-emerge')
      if (s && seen.at(-1) !== s) seen.push(s)
    })
    mo.observe(el, { attributes: true, attributeFilter: ['data-goop-emerge'] })
    await w.setProps({ open: false })
    await flushPromises()
    mo.disconnect()
    expect(seen).toContain('closing')
    w.unmount()
    expect(isLoopRunning()).toBe(false)
  })

  it('reduced motion: opens at rest, nothing ticks', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = content()!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(el.style.getPropertyValue('--goop-emerge-content')).toBe('1')
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    expect(content()!.getAttribute('data-goop-emerge')).toBe('open')
    w.unmount()
  })
})

describe('hover card props', () => {
  it('default on, popover surface; every toggle reaches core', () => {
    expect(toHoverCardOptions({})).toMatchObject({
      flow: true,
      flowStyle: 'bloom',
      wobble: true,
      fade: true,
      openSlosh: true,
      openDrips: true,
      closeSlosh: true,
      surfaceColor: 'popover',
      speed: 1,
    })
    const off = toHoverCardOptions(
      { wobble: false, fade: false, openSlosh: false, openDrips: false, closeSlosh: false, flow: false, bridge: false, momentum: false, surface: 'trigger', openDripAmount: 2 },
      { preset: 'wild', reducedMotion: true },
    )
    expect(off).toMatchObject({ wobble: false, fade: false, openSlosh: false, openDrips: false, closeSlosh: false, flow: false, bridge: false, momentum: false, surfaceColor: 'trigger', openDripAmount: 2, preset: 'wild', reducedMotion: true })
  })
})

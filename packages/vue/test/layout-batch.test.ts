// Layout batch (AspectRatio, ScrollArea, Resizable): client render, goo attach, props and
// inheritance, plus SSR markup hydrating with no mismatch.
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  GoopAspectRatio,
  GoopResizableHandle,
  GoopResizablePanel,
  GoopResizablePanelGroup,
  GoopScrollArea,
  GoopScrollBar,
  RESIZABLE_PROP_KEYS,
  SCROLL_AREA_PROP_KEYS,
  goopComponents,
  resolveResizableProps,
  toResizableOptions,
  toScrollAreaOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

const lines = () => Array.from({ length: 40 }, (_, i) => h('p', `Line ${i + 1}`))

const splitter = (groupProps: Record<string, unknown> = {}, handleProps: Record<string, unknown> = {}) => () =>
  h(GoopResizablePanelGroup, { direction: 'horizontal', ...groupProps }, () => [
    h(GoopResizablePanel, { defaultSize: 50 }, () => 'One'),
    h(GoopResizableHandle, { withHandle: true, ...handleProps }),
    h(GoopResizablePanel, { defaultSize: 50 }, () => 'Two'),
  ])

describe('layout batch: props', () => {
  it('is in the manifest; props map to core options', () => {
    for (const n of ['GoopAspectRatio', 'GoopScrollArea', 'GoopScrollBar', 'GoopResizablePanelGroup', 'GoopResizablePanel', 'GoopResizableHandle'])
      expect(goopComponents).toContain(n)
    expect([...SCROLL_AREA_PROP_KEYS]).toEqual(['goo', 'stretch', 'jelly', 'speed', 'preset'])
    expect([...RESIZABLE_PROP_KEYS]).toEqual(['goo', 'bulge', 'wobble', 'speed', 'preset'])
    expect(toScrollAreaOptions({ goo: false })).toBeNull()
    expect(toScrollAreaOptions({ stretch: false, jelly: 0 })).toBeNull()
    expect(toScrollAreaOptions({ stretch: false }, { preset: 'wild' })).toEqual({ stretch: false, preset: 'wild', reducedMotion: undefined })
    expect(toResizableOptions({ goo: false })).toBeNull()
    expect(toResizableOptions({ bulge: false })).toBeNull()
    expect(toResizableOptions({ wobble: false, speed: 2 })).toMatchObject({ wobble: false, speed: 2 })
    expect(resolveResizableProps({ wobble: false }, { wobble: true, preset: 'subtle' })).toEqual({ wobble: false, preset: 'subtle' })
  })
})

describe('GoopAspectRatio', () => {
  it("renders reka's ratio box with shadcn's slot", async () => {
    const w = mount(GoopAspectRatio, { attachTo: document.body, props: { ratio: 16 / 9 }, slots: { default: () => h('img', { alt: '' }) } })
    await nextTick()
    const box = w.get('[data-slot="aspect-ratio"]')
    expect(box.find('img').exists()).toBe(true)
    expect((box.element.parentElement as HTMLElement).style.paddingBottom).toContain('56.25')
    expect(w.find('[data-goop]').exists()).toBe(false)
    w.unmount()
  })
})

describe('GoopScrollArea', () => {
  it('marks the viewport, gives the thumb a goo body and attaches the engine', async () => {
    const w = mount(GoopScrollArea, { attachTo: document.body, props: { type: 'always', class: 'h-40' }, slots: { default: lines } })
    await flushPromises()
    const root = w.get('[data-slot="scroll-area"]')
    expect(root.attributes('data-goop-host')).toBe('scroll-area')
    expect(root.classes()).toContain('h-40')
    expect(root.attributes('data-goop-scroll-root')).toBe('')
    expect(w.find('[data-slot="scroll-area-viewport"]').attributes('data-goop-scroll-viewport')).toBe('')
    const vm = w.vm as unknown as { handle: unknown }
    expect(vm.handle).not.toBeNull()
    const thumb = w.find('[data-slot="scroll-area-thumb"]')
    if (thumb.exists()) {
      expect(thumb.classes()).not.toContain('bg-border')
      expect(thumb.find('[data-goop-scroll-thumb]').attributes('aria-hidden')).toBe('true')
    }
    w.unmount()
  })

  it('goo=false is a plain shadcn ScrollArea; a horizontal GoopScrollBar follows its root', async () => {
    const w = mount(GoopScrollArea, {
      attachTo: document.body,
      props: { goo: false, type: 'always' },
      slots: { default: () => [h('div', { style: 'width: 2000px' }, 'wide'), h(GoopScrollBar, { orientation: 'horizontal' })] },
    })
    await flushPromises()
    expect(w.get('[data-slot="scroll-area"]').attributes('data-goop-host')).toBeUndefined()
    expect(w.find('[data-goop-scroll-thumb]').exists()).toBe(false)
    expect((w.vm as unknown as { handle: unknown }).handle).toBeNull()
    w.unmount()
  })
})

describe('GoopResizable', () => {
  it('renders nova markup; the handle hosts one aria-hidden bead layer and a marked grip', async () => {
    const w = mount({ render: splitter() }, { attachTo: document.body })
    await flushPromises()
    expect(w.get('[data-slot="resizable-panel-group"]').classes()).toContain('flex')
    expect(w.findAll('[data-slot="resizable-panel"]')).toHaveLength(2)
    const handle = w.get('[data-slot="resizable-handle"]')
    expect(handle.classes()).toContain('bg-border')
    expect(handle.find('[data-goop-grip]').classes()).toContain('rounded-lg')
    expect(handle.findAll('svg[data-goop="resizable"]')).toHaveLength(1)
    expect(handle.get('svg[data-goop="resizable"]').attributes('aria-hidden')).toBe('true')
    w.unmount()
  })

  it('goo=false on the group (inherited) or bulge=false on the handle renders a plain handle', async () => {
    for (const w of [mount({ render: splitter({ goo: false }) }, { attachTo: document.body }), mount({ render: splitter({}, { bulge: false }) }, { attachTo: document.body })]) {
      await flushPromises()
      expect(w.find('svg[data-goop="resizable"]').exists()).toBe(false)
      w.unmount()
    }
  })
})

describe('layout batch: hydration', () => {
  it('hydrates without mismatch, then the goo attaches', async () => {
    const App = {
      render: () => [
        h(GoopAspectRatio, { ratio: 1 }, () => h('span', 'square')),
        h(GoopScrollArea, { class: 'h-20' }, lines),
        splitter()(),
      ],
    }
    const html = await renderToString(createSSRApp(App))
    expect(html).not.toContain('data-goop="resizable"')
    expect(html).not.toContain('data-goop-scroll-root')
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.append(root)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createSSRApp(App)
    app.mount(root)
    await flushPromises()
    const messages = [...warn.mock.calls, ...error.mock.calls].map((c) => String(c[0]))
    warn.mockRestore()
    error.mockRestore()
    expect(messages.filter((m) => /hydration|mismatch/i.test(m))).toEqual([])
    expect(root.querySelector('[data-goop-scroll-root]')).not.toBeNull()
    expect(root.querySelector('svg[data-goop="resizable"]')).not.toBeNull()
    app.unmount()
    expect(root.querySelector('svg[data-goop="resizable"]')).toBeNull()
  })
})

// Client tests for the layout batch: AspectRatio, ScrollArea, Resizable. Each renders shadcn/ui's
// markup, keeps engine props off the DOM, and attaches the same core engine as @goopui/vue.
import type { ResizableHandle, ScrollAreaHandle } from '@goopui/core'
import { act, cleanup, render } from '@testing-library/react'
import { createElement as h, createRef } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoopAspectRatio,
  GoopResizableHandle,
  GoopResizablePanel,
  GoopResizablePanelGroup,
  GoopScrollArea,
  GoopScrollBar,
  goopComponents,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const lines = () => Array.from({ length: 40 }, (_, i) => h('p', { key: i }, `Line ${i + 1}`))

const splitter = (groupProps: Record<string, unknown> = {}, handleProps: Record<string, unknown> = {}) =>
  h(
    GoopResizablePanelGroup,
    { orientation: 'horizontal', id: 'g', ...groupProps },
    h(GoopResizablePanel, { defaultSize: 50, id: 'a' }, 'One'),
    h(GoopResizableHandle, { withHandle: true, id: 'h', ...handleProps }),
    h(GoopResizablePanel, { defaultSize: 50, id: 'b' }, 'Two'),
  )

describe('layout batch', () => {
  it('is in the manifest', () => {
    for (const n of ['GoopAspectRatio', 'GoopScrollArea', 'GoopScrollBar', 'GoopResizablePanelGroup', 'GoopResizablePanel', 'GoopResizableHandle'])
      expect(goopComponents).toContain(n)
  })

  it('GoopAspectRatio: a plain Radix ratio box, ref is the DOM node', () => {
    const ref = createRef<HTMLDivElement>()
    render(h(GoopAspectRatio, { ratio: 16 / 9, ref }, h('img', { alt: '' })))
    const box = document.querySelector('[data-slot="aspect-ratio"]') as HTMLElement
    expect(ref.current).toBe(box)
    expect((box.parentElement as HTMLElement).style.paddingBottom).toContain('56.25')
    expect(document.querySelector('[data-goop]')).toBeNull()
  })

  it('GoopScrollArea: marks the viewport, attaches the engine, keeps engine props off the DOM', async () => {
    const ref = createRef<HTMLDivElement>()
    const goopRef = createRef<ScrollAreaHandle>()
    render(h(GoopScrollArea, { ref, goopRef, type: 'always', className: 'h-40', jelly: 2, preset: 'wild' }, lines()))
    await act(async () => {})
    const root = document.querySelector('[data-slot="scroll-area"]') as HTMLElement
    expect(ref.current).toBe(root)
    expect(goopRef.current).not.toBeNull()
    expect(root.getAttribute('data-goop-host')).toBe('scroll-area')
    expect(root.className).toContain('h-40')
    expect(root.hasAttribute('jelly')).toBe(false)
    expect(root.hasAttribute('preset')).toBe(false)
    expect(root.hasAttribute('data-goop-scroll-root')).toBe(true)
    expect(document.querySelector('[data-slot="scroll-area-viewport"]')?.hasAttribute('data-goop-scroll-viewport')).toBe(true)
    // Keyboard users can focus the viewport to scroll it (as reka-ui's is).
    expect(document.querySelector('[data-slot="scroll-area-viewport"]')?.getAttribute('tabindex')).toBe('0')
  })

  it('GoopScrollArea goo={false} is plain shadcn; a horizontal GoopScrollBar follows its root', async () => {
    const goopRef = createRef<ScrollAreaHandle>()
    render(h(GoopScrollArea, { goo: false, goopRef, type: 'always' }, h('div', { style: { width: 2000 } }, 'wide'), h(GoopScrollBar, { orientation: 'horizontal' })))
    await act(async () => {})
    expect(document.querySelector('[data-slot="scroll-area"]')?.hasAttribute('data-goop-host')).toBe(false)
    expect(document.querySelector('[data-goop-scroll-thumb]')).toBeNull()
    expect(goopRef.current).toBeNull()
  })

  it('GoopResizable: nova markup; the handle hosts one aria-hidden bead layer; ref / goopRef', async () => {
    const ref = createRef<HTMLDivElement>()
    const goopRef = createRef<ResizableHandle>()
    render(splitter({ preset: 'subtle' }, { ref, goopRef }))
    await act(async () => {})
    const handle = document.querySelector('[data-slot="resizable-handle"]') as HTMLElement
    expect(ref.current).toBe(handle)
    expect(goopRef.current).not.toBeNull()
    expect(handle.className).toContain('bg-border')
    expect(handle.querySelector('[data-goop-grip]')?.className).toContain('rounded-lg')
    expect(handle.querySelectorAll('svg[data-goop="resizable"]')).toHaveLength(1)
    expect(handle.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(document.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2)
    expect(document.querySelector('[data-slot="resizable-panel-group"]')?.hasAttribute('preset')).toBe(false)
  })

  it('goo={false} on the group (inherited) or bulge={false} on the handle: a plain handle', async () => {
    for (const view of [splitter({ goo: false }), splitter({}, { bulge: false })]) {
      const r = render(view)
      await act(async () => {})
      expect(document.querySelector('svg[data-goop="resizable"]')).toBeNull()
      r.unmount()
    }
  })
})

describe('hydration: layout batch', () => {
  it('hydrates without mismatch, then the goo attaches', async () => {
    const App = () =>
      h('div', null, h(GoopAspectRatio, { ratio: 1 }, h('span', null, 'square')), h(GoopScrollArea, { className: 'h-20' }, lines()), splitter())
    const html = renderToString(App())
    expect(html).not.toContain('data-goop="resizable"')
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.append(root)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recoverable: unknown[] = []
    let r!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      r = hydrateRoot(root, App(), { onRecoverableError: (e) => recoverable.push(e) })
    })
    await act(async () => new Promise((res) => setTimeout(res, 0)))
    const messages = [...error.mock.calls, ...warn.mock.calls].map((c) => String(c[0]))
    error.mockRestore()
    warn.mockRestore()
    expect(recoverable).toEqual([])
    expect(messages.filter((m) => /hydrat|mismatch|did not match/i.test(m))).toEqual([])
    expect(root.querySelector('[data-goop-scroll-root]')).not.toBeNull()
    expect(root.querySelector('svg[data-goop="resizable"]')).not.toBeNull()
    act(() => r.unmount())
  })
})

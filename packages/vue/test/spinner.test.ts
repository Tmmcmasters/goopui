import { activeTickerCount, isLoopRunning, spinnerCircleCount } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { GoopPlugin, GoopSpinner } from '../src'

const blobs = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="blob"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopSpinner', () => {
  it('announces loading like shadcn (role/aria, overridable label)', () => {
    const w = mount(GoopSpinner, { attachTo: document.body })
    expect(w.attributes('role')).toBe('status')
    expect(w.attributes('aria-label')).toBe('Loading')
    expect(w.attributes('data-slot')).toBe('spinner')
    // The drawing itself is hidden from assistive tech.
    expect(w.element.querySelector('[data-goop="layer"]')!.getAttribute('aria-hidden')).toBe('true')
    w.unmount()
    const custom = mount(GoopSpinner, { attrs: { 'aria-label': 'Saving' } })
    expect(custom.attributes('aria-label')).toBe('Saving')
    custom.unmount()
  })

  it('merges classes with tailwind-merge semantics (size override wins)', () => {
    const w = mount(GoopSpinner, { props: { class: 'size-8 text-primary' } })
    const cls = w.classes()
    expect(cls).toContain('size-8')
    expect(cls).not.toContain('size-4')
    expect(cls).toContain('text-primary')
    expect(cls).toContain('relative')
    expect(w.attributes('style')).toContain('--goop-color: currentColor')
    w.unmount()
  })

  it('mounts on the shared loop and unmounts cleanly (loop sleeps)', async () => {
    const w = mount(GoopSpinner, { props: { blobs: 5 }, attachTo: document.body })
    await nextTick()
    expect(w.attributes()).toHaveProperty('data-goop-active')
    expect(w.find('svg').exists()).toBe(false) // SSR fallback gone once attached
    expect(blobs(w.element)).toHaveLength(spinnerCircleCount(5))
    expect(isLoopRunning()).toBe(true)

    await w.setProps({ blobs: 3 })
    expect(blobs(w.element)).toHaveLength(spinnerCircleCount(3))

    const el = w.element
    w.unmount()
    expect(activeTickerCount()).toBe(0)
    expect(isLoopRunning()).toBe(false)
    expect(el.querySelector('[data-goop="layer"]')).toBeNull()
    expect(document.querySelector('[data-goop-defs]')).toBeNull()
  })

  it('reduced motion: static merged arrangement, nothing ticks', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(GoopSpinner, { attachTo: document.body })
    await nextTick()
    expect(w.attributes('role')).toBe('status')
    expect(activeTickerCount()).toBe(0)
    const pose = Array.from(blobs(w.element), (b) => b.style.transform)
    expect(pose.filter((t) => t.startsWith('translate')).length).toBeGreaterThanOrEqual(4)
    await w.setProps({ speed: 4 })
    expect(Array.from(blobs(w.element), (b) => b.style.transform)).toEqual(pose)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(GoopSpinner, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await nextTick()
    expect(w.vm.handle?.reducedMotion).toBe(true)
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('hydrates SSR markup without mismatch, then attaches', async () => {
    const App = { render: () => [h(GoopSpinner), h(GoopSpinner, { class: 'size-8', blobs: 6 })] }
    const html = await renderToString(createSSRApp(App))
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
    expect(root.querySelectorAll('[data-slot="spinner"][data-goop-active]')).toHaveLength(2)
    app.unmount()
    expect(isLoopRunning()).toBe(false)
  })
})

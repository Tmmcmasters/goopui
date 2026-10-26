import * as core from '@goopui/core'
import type { GoopHandle, GoopOptions } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { GoopButton, GoopPlugin } from '../src'

// Spy on the real engine: attachGoop runs for real in happy-dom, we just record calls.
const handles: { handle: GoopHandle; update: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[] = []
vi.mock('@goopui/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('@goopui/core')>()
  return {
    ...real,
    attachGoop: vi.fn((el: HTMLElement, opts?: GoopOptions) => {
      const handle = real.attachGoop(el, opts)
      const update = vi.fn(handle.update.bind(handle))
      const destroy = vi.fn(handle.destroy.bind(handle))
      const wrapped = Object.create(handle, {
        update: { value: update },
        destroy: { value: destroy },
      }) as GoopHandle
      handles.push({ handle: wrapped, update, destroy })
      return wrapped
    }),
  }
})
const attachGoop = vi.mocked(core.attachGoop)

beforeEach(() => {
  handles.length = 0
  attachGoop.mockClear()
})
afterEach(() => {
  document.body.innerHTML = ''
})

const mountButton = (props: Record<string, unknown> = {}, slot = 'Click me') =>
  mount(GoopButton, { props, slots: { default: slot }, attachTo: document.body })

describe('native button behavior', () => {
  it('renders a <button> with type, aria and click intact', async () => {
    const onClick = vi.fn()
    const w = mount(GoopButton, {
      props: {},
      attrs: { type: 'submit', 'aria-label': 'Save', 'aria-pressed': 'true', onClick },
      slots: { default: 'Save' },
      attachTo: document.body,
    })
    const el = w.element as HTMLButtonElement
    expect(el.tagName).toBe('BUTTON')
    expect(el.type).toBe('submit')
    expect(el.getAttribute('aria-label')).toBe('Save')
    expect(el.getAttribute('aria-pressed')).toBe('true')
    expect(el.textContent).toBe('Save')
    await w.trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
    w.unmount()
  })

  it('disabled sets the native attribute and tells the engine', async () => {
    const w = mountButton({ disabled: true })
    await flushPromises()
    const el = w.element as HTMLButtonElement
    expect(el.disabled).toBe(true)
    expect(attachGoop.mock.calls[0]?.[1]).toMatchObject({ disabled: true })
    await w.setProps({ disabled: false })
    expect(el.disabled).toBe(false)
    expect(el.hasAttribute('disabled')).toBe(false)
    expect(handles[0]?.update).toHaveBeenLastCalledWith(expect.objectContaining({ disabled: false }))
    w.unmount()
  })

  it('wraps content in [data-goop-label] so labels ride the body', () => {
    const w = mountButton()
    expect(w.find('[data-goop-label]').text()).toBe('Click me')
    w.unmount()
  })
})

describe('asChild', () => {
  it('renders the child with merged classes and attrs', async () => {
    const w = mount(GoopButton, {
      props: { asChild: true, variant: 'outline', class: 'mt-2' },
      attrs: { 'data-test': 'x', 'aria-label': 'Home link' },
      slots: { default: () => h('a', { href: '/home', class: 'underline' }, 'Home') },
      attachTo: document.body,
    })
    await flushPromises()
    const el = w.element as HTMLAnchorElement
    expect(el.tagName).toBe('A')
    expect(el.getAttribute('href')).toBe('/home')
    expect(el.getAttribute('data-slot')).toBe('button')
    expect(el.getAttribute('data-variant')).toBe('outline')
    expect(el.getAttribute('data-test')).toBe('x')
    expect(el.getAttribute('aria-label')).toBe('Home link')
    expect(el.classList).toContain('underline')
    expect(el.classList).toContain('mt-2')
    expect(el.classList).toContain('border-border')
    expect(el.hasAttribute('disabled')).toBe(false)
    // The goo attaches to the child element itself.
    expect(attachGoop).toHaveBeenCalledWith(el, expect.any(Object))
    expect(el.querySelector(':scope > [data-goop="layer"]')).not.toBeNull()
    w.unmount()
  })
})

describe('engine lifecycle', () => {
  it('attaches on mount and destroys on unmount', async () => {
    const w = mountButton()
    await flushPromises()
    expect(attachGoop).toHaveBeenCalledTimes(1)
    expect(attachGoop.mock.calls[0]?.[0]).toBe(w.element)
    expect(w.element.querySelector('[data-goop="layer"]')?.getAttribute('aria-hidden')).toBe('true')
    // After attach the host is transparent and marked active; the goo paints the fill.
    expect(w.attributes('data-goop-active')).toBe('')
    expect((w.element as HTMLElement).style.backgroundColor).toBe('transparent')
    expect((w.vm as unknown as { handle: GoopHandle | null }).handle).toBe(handles[0]?.handle)

    const el = w.element
    w.unmount()
    expect(handles[0]?.destroy).toHaveBeenCalledTimes(1)
    expect(el.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('goo=false never attaches; toggling it attaches and destroys', async () => {
    const w = mountButton({ goo: false })
    await flushPromises()
    expect(attachGoop).not.toHaveBeenCalled()
    await w.setProps({ goo: true })
    await flushPromises()
    expect(attachGoop).toHaveBeenCalledTimes(1)
    await w.setProps({ goo: false })
    await flushPromises()
    expect(handles[0]?.destroy).toHaveBeenCalledTimes(1)
    expect(w.attributes('data-goop-active')).toBeUndefined()
    w.unmount()
  })

  it('maps props to engine options at attach (features, preset, escape hatch)', async () => {
    const w = mountButton({
      preset: 'subtle',
      shockwave: false,
      taffy: true,
      gloss: 0.4,
      dripSize: 9,
      splash: false,
      goop: { dripCount: 2, shockwave: 2 },
    })
    await flushPromises()
    const opts = attachGoop.mock.calls[0]?.[1]
    expect(opts).toMatchObject({
      preset: 'subtle',
      shockwave: 0, // explicit prop beats the goop escape hatch
      taffy: true,
      gloss: 0.4,
      dripSize: 9,
      splash: 'off',
      dripCount: 2,
    })
    expect(typeof opts?.seed).toBe('number')
    w.unmount()
  })

  it('prop changes call handle.update (no remount, renderer included)', async () => {
    const w = mountButton({ dripSize: 9 })
    await flushPromises()
    const { update, destroy } = handles[0]!

    await w.setProps({ shockwave: false })
    await flushPromises()
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ shockwave: 0 }))

    await w.setProps({ renderer: 'canvas', finish: 'oil', preset: 'wild' })
    await flushPromises()
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ renderer: 'canvas', finish: 'oil', preset: 'wild' }))

    // A prop going back to undefined is sent as undefined, so core resets it.
    await w.setProps({ dripSize: undefined })
    await flushPromises()
    const last = update.mock.lastCall?.[0] as Record<string, unknown>
    expect('dripSize' in last && last.dripSize === undefined).toBe(true)

    expect(destroy).not.toHaveBeenCalled()
    expect(attachGoop).toHaveBeenCalledTimes(1)
    w.unmount()
  })

  it('unrelated re-renders do not call update', async () => {
    const Parent = defineComponent({
      props: { label: { type: String, default: 'a' } },
      setup: (p) => () => h(GoopButton, { dripSize: 9 }, () => p.label),
    })
    const w = mount(Parent, { attachTo: document.body })
    await flushPromises()
    const { update } = handles[0]!
    await w.setProps({ label: 'b' })
    await flushPromises()
    expect(update).not.toHaveBeenCalled()
    w.unmount()
  })

  it('oil CSS-only vars become inline --goop-* style', async () => {
    const w = mountButton({ oilIntensity: 0.5 })
    expect((w.element as HTMLElement).style.getPropertyValue('--goop-oil-intensity')).toBe('0.5')
    w.unmount()
  })

  it('exposes the handle methods', async () => {
    const w = mountButton()
    await flushPromises()
    const vm = w.vm as unknown as Record<string, (...a: unknown[]) => unknown>
    const h0 = handles[0]!.handle
    const spy = vi.spyOn(h0, 'shockwave')
    vm.shockwave!(10, 5, 1, { vx: 100 })
    expect(spy).toHaveBeenCalledWith(10, 5, 1, { vx: 100 })
    for (const m of ['addGoop', 'drip', 'press', 'release', 'hover', 'feedPointer', 'inspect', 'refresh']) {
      expect(typeof vm[m]).toBe('function')
    }
    w.unmount()
  })

  it('app-wide config (GoopPlugin) is the lowest precedence', async () => {
    const w = mount(GoopButton, {
      props: { renderer: 'svg' },
      global: { plugins: [[GoopPlugin, { preset: 'subtle', renderer: 'canvas' }]] },
      attachTo: document.body,
    })
    await nextTick()
    expect(attachGoop.mock.calls[0]?.[1]).toMatchObject({ preset: 'subtle', renderer: 'svg' })
    w.unmount()
  })
})

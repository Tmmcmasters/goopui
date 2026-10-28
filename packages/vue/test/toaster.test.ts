import { TOAST_GOO_ATTR } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { GoopToaster, TOASTER_PROP_KEYS, goopComponents, toToasterOptions } from '../src'

const settle = async () => {
  await flushPromises()
  await nextTick()
  await new Promise((r) => setTimeout(r, 20))
}
const layer = () => document.body.querySelector('[data-goop="toaster"]')
const items = () => document.querySelectorAll<HTMLElement>('[data-sonner-toast]')

afterEach(async () => {
  toast.dismiss()
  await new Promise((r) => setTimeout(r, 250))
  document.body.innerHTML = ''
})

describe('GoopToaster', () => {
  it('is in the manifest and maps props to core options', () => {
    expect(goopComponents).toContain('GoopToaster')
    expect(TOASTER_PROP_KEYS).toEqual(['goo', 'dropIn', 'merge', 'drips', 'speed', 'preset'])
    expect(toToasterOptions({ dropIn: false, merge: 0.5, speed: 2 }, { preset: 'wild' })).toEqual({
      preset: 'wild',
      reducedMotion: undefined,
      speed: 2,
      dropIn: false,
      merge: 0.5,
    })
  })

  it('renders shadcn Sonner (tokens, class, rounded-2xl toasts, icons) with one goo layer', async () => {
    const w = mount(GoopToaster, {
      attachTo: document.body,
      props: { class: 'extra', richColors: true },
    })
    await settle()
    expect(layer()).not.toBeNull()
    expect(layer()!.getAttribute('aria-hidden')).toBe('true')
    toast.success('Saved')
    await settle()
    const list = document.querySelector<HTMLElement>('[data-sonner-toaster]')!
    expect(list.className).toContain('toaster')
    expect(list.className).toContain('extra')
    expect(list.style.getPropertyValue('--normal-bg')).toBe('var(--popover)')
    expect(list.getAttribute('data-rich-colors')).toBe('true')
    const li = items()[0]!
    expect(li.className).toContain('rounded-2xl')
    expect(li.textContent).toContain('Saved')
    // shadcn's lucide CircleCheck in the icon slot.
    expect(li.querySelector('[data-icon] svg circle')).not.toBeNull()
    expect((w.vm as unknown as { handle: unknown }).handle).not.toBeNull()
    w.unmount()
    expect(layer()).toBeNull()
  })

  it('paints opaque toasts as goo, and restores them when goo turns off', async () => {
    const w = mount(GoopToaster, {
      attachTo: document.body,
      props: { toastOptions: { style: { background: 'rgb(10, 20, 30)' } } },
    })
    await settle()
    toast('Hello')
    await settle()
    const li = items()[0]!
    expect(li.hasAttribute(TOAST_GOO_ATTR)).toBe(true)
    expect(li.style.getPropertyValue('background')).toBe('transparent')
    await w.setProps({ goo: false })
    await settle()
    expect(layer()).toBeNull()
    expect(li.hasAttribute(TOAST_GOO_ATTR)).toBe(false)
    expect(li.style.getPropertyValue('background')).toBe('rgb(10, 20, 30)')
    w.unmount()
  })

  it('goo=false is a plain Sonner', async () => {
    const w = mount(GoopToaster, { attachTo: document.body, props: { goo: false } })
    await settle()
    toast('Plain')
    await settle()
    expect(items().length).toBe(1)
    expect(layer()).toBeNull()
    expect((w.vm as unknown as { handle: unknown }).handle).toBeNull()
    w.unmount()
  })
})

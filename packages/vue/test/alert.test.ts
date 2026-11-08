import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import {
  ALERT_PROP_KEYS,
  GoopAlert,
  GoopAlertAction,
  GoopAlertDescription,
  GoopAlertTitle,
  alertVariants,
  goopAlertProps,
  goopComponents,
  toAlertOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopAlert', () => {
  it('is in the manifest, every effect is a prop', () => {
    for (const n of ['GoopAlert', 'GoopAlertAction', 'GoopAlertDescription', 'GoopAlertTitle']) expect(goopComponents).toContain(n)
    for (const k of ALERT_PROP_KEYS) expect(goopAlertProps).toHaveProperty(k)
    expect(toAlertOptions({ goo: false })).toBeNull()
    expect(toAlertOptions({ bloom: false, wobble: 0.5, speed: 2 }, { preset: 'wild' })).toMatchObject({ bloom: false, wobble: 0.5, speed: 2, preset: 'wild' })
  })

  it("renders shadcn's markup and classes", () => {
    const w = mount(GoopAlert, {
      props: { variant: 'destructive', class: 'mt-4' },
      slots: {
        default: () => [
          h('svg', { 'data-icon': '' }),
          h(GoopAlertTitle, null, () => 'Heads up'),
          h(GoopAlertDescription, null, () => 'Body'),
          h(GoopAlertAction, null, () => 'Undo'),
        ],
      },
    })
    const el = w.get('[data-slot="alert"]')
    expect(el.attributes('role')).toBe('alert')
    for (const c of alertVariants({ variant: 'destructive' }).split(' ')) expect(el.classes()).toContain(c)
    expect(el.classes()).toContain('mt-4')
    expect(w.find('[data-slot="alert-title"]').classes()).toContain('font-medium')
    expect(w.find('[data-slot="alert-description"]').classes()).toContain('text-muted-foreground')
    expect(w.find('[data-slot="alert-action"]').classes()).toContain('absolute')
    w.unmount()
  })

  it('attaches the entrance layer on mount and removes it on unmount; goo=false stays plain', async () => {
    const w = mount(GoopAlert, { attachTo: document.body, slots: { default: () => 'Hi' } })
    await nextTick()
    expect(w.vm.handle).not.toBeNull()
    expect(w.find('[data-goop="alert"]').exists()).toBe(true)
    expect(w.find('[data-goop="alert"]').attributes('aria-hidden')).toBe('true')
    await w.setProps({ goo: false })
    expect(w.vm.handle).toBeNull()
    expect(w.find('[data-goop="alert"]').exists()).toBe(false)
    w.unmount()
  })
})

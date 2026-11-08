import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import {
  BUTTON_GROUP_PROP_KEYS,
  GoopButton,
  GoopButtonGroup,
  GoopButtonGroupSeparator,
  GoopButtonGroupText,
  buttonGroupVariants,
  goopButtonGroupProps,
  goopComponents,
  toButtonGroupOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GoopButtonGroup', () => {
  it('is in the manifest; every effect is a prop', () => {
    for (const n of ['GoopButtonGroup', 'GoopButtonGroupSeparator', 'GoopButtonGroupText']) expect(goopComponents).toContain(n)
    for (const k of BUTTON_GROUP_PROP_KEYS) expect(goopButtonGroupProps).toHaveProperty(k)
    expect(toButtonGroupOptions({ goo: false })).toBeNull()
    expect(toButtonGroupOptions({ tug: false, press: 2 }, { preset: 'wild' }, 'vertical')).toMatchObject({ tug: false, press: 2, preset: 'wild', orientation: 'vertical' })
  })

  it("renders shadcn's markup; GoopButtons inside keep their own goo off unless they set it", async () => {
    const w = mount(GoopButtonGroup, {
      attachTo: document.body,
      props: { orientation: 'vertical', class: 'mx-2' },
      slots: {
        default: () => [
          h(GoopButton, { variant: 'outline' }, () => 'A'),
          h(GoopButtonGroupSeparator),
          h(GoopButton, { variant: 'outline', goo: true }, () => 'B'),
          h(GoopButtonGroupText, null, () => 'Text'),
        ],
      },
    })
    await nextTick()
    const g = w.get('[data-slot="button-group"]')
    expect(g.attributes('role')).toBe('group')
    expect(g.attributes('data-orientation')).toBe('vertical')
    for (const c of buttonGroupVariants({ orientation: 'vertical' }).split(' ')) expect(g.classes()).toContain(c)
    expect(g.classes()).toContain('mx-2')
    const [a, b] = w.findAll('[data-slot="button"]')
    expect(a!.attributes('data-goop-host')).toBeUndefined()
    expect(b!.attributes('data-goop-host')).toBeDefined()
    const sep = w.get('[data-slot="button-group-separator"]')
    expect(sep.attributes('data-orientation')).toBe('vertical')
    expect(sep.classes()).toContain('bg-input')
    expect(w.get('div.bg-muted').classes()).toContain('bg-muted')
    expect(w.vm.handle).not.toBeNull()
    await w.setProps({ goo: false })
    expect(w.vm.handle).toBeNull()
    w.unmount()
  })
})

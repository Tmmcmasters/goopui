import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  GoopInputOTP,
  GoopInputOTPGroup,
  GoopInputOTPSeparator,
  GoopInputOTPSlot,
  GoopNumberField,
  GoopNumberFieldContent,
  GoopNumberFieldDecrement,
  GoopNumberFieldIncrement,
  GoopNumberFieldInput,
  goopComponents,
  goopInputOTPProps,
  goopNumberFieldProps,
  toInputOTPOptions,
  toNumberFieldOptions,
} from '../src'

const layers = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="layer"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

type NumberFieldHandleLike = {
  state: { buttons: { down: boolean; kick: number }[] }
  input: { state: { shown: boolean } }
  reducedMotion: boolean
  running: boolean
}

const numberField = (props: Record<string, unknown> = {}, model = ref<number | undefined>(5)) =>
  defineComponent(() => () =>
    h(
      GoopNumberField as never,
      { ...props, modelValue: model.value, 'onUpdate:modelValue': (v: number) => (model.value = v), min: 0, max: 10 },
      {
        default: () =>
          h(GoopNumberFieldContent as never, { ref: 'content' }, {
            default: () => [h(GoopNumberFieldDecrement), h(GoopNumberFieldInput, { 'aria-label': 'Count' }), h(GoopNumberFieldIncrement)],
          }),
      },
    ),
  )

describe('GoopNumberField', () => {
  it('is in the manifest with every part', () => {
    for (const n of ['GoopNumberField', 'GoopNumberFieldContent', 'GoopNumberFieldInput', 'GoopNumberFieldIncrement', 'GoopNumberFieldDecrement']) {
      expect(goopComponents).toContain(n)
    }
  })

  it('maps props to core options (ring + stepper toggles)', () => {
    const o = toNumberFieldOptions({ squish: false, nudge: 2, ripple: false, speed: 2 })
    expect(o).toMatchObject({ squish: false, nudge: 2, ripple: false, speed: 2 })
    expect('flow' in o).toBe(false)
    for (const k of ['flow', 'close', 'ripple', 'wobble', 'drain', 'drip', 'drips', 'squish', 'nudge', 'speed', 'preset', 'renderer']) {
      expect(goopNumberFieldProps).toHaveProperty(k)
    }
  })

  it('renders shadcn structure with accessible controls and two aria-hidden goo layers', async () => {
    const w = mount(numberField(), { attachTo: document.body })
    await flushPromises()
    const input = w.get('input')
    expect(input.attributes('data-slot')).toBe('input')
    expect(input.attributes('role')).toBe('spinbutton')
    expect(input.attributes('aria-valuenow')).toBe('5')
    expect(input.attributes('aria-label')).toBe('Count')
    expect(input.classes()).toContain('text-center')
    // The goo ring is the focus indicator.
    expect(input.classes()).toContain('focus-visible:ring-0')
    expect(input.classes()).toContain('focus-visible:outline-none!')
    expect(w.get('[data-slot="increment"]').attributes('aria-label')).toBe('Increase')
    expect(w.get('[data-slot="decrement"]').attributes('aria-label')).toBe('Decrease')
    const content = w.get('[data-slot="number-field-content"]')
    expect(content.attributes()).toHaveProperty('data-goop-active')
    const ls = layers(content.element)
    expect(ls).toHaveLength(2)
    for (const l of ls) expect(l.getAttribute('aria-hidden')).toBe('true')
    w.unmount()
  })

  it('increment / decrement step the value, squish the button and nudge toward its side', async () => {
    const model = ref<number | undefined>(5)
    const w = mount(numberField({}, model), { attachTo: document.body })
    await flushPromises()
    const handle = () => (w.findComponent(GoopNumberFieldContent).vm as unknown as { handle: NumberFieldHandleLike }).handle
    const inc = w.get('[data-slot="increment"]')
    inc.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }))
    await flushPromises()
    expect(model.value).toBe(6)
    expect(handle().state.buttons[1]!.down).toBe(true)
    expect(handle().state.buttons[1]!.kick).toBeLessThan(0.2)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }))
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }))
    expect(handle().state.buttons[1]!.down).toBe(false)
    const dec = w.get('[data-slot="decrement"]')
    dec.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }))
    await flushPromises()
    expect(model.value).toBe(5)
    expect(handle().state.buttons[0]!.kick).toBeLessThan(0.2)
    w.unmount()
  })

  it('arrow keys step and nudge; the press focuses the field, showing the ring', async () => {
    const model = ref<number | undefined>(5)
    const w = mount(numberField({}, model), { attachTo: document.body })
    await flushPromises()
    const handle = () => (w.findComponent(GoopNumberFieldContent).vm as unknown as { handle: NumberFieldHandleLike }).handle
    const input = w.get('input')
    ;(input.element as HTMLInputElement).focus()
    await input.trigger('keydown', { key: 'ArrowUp' })
    await flushPromises()
    expect(model.value).toBe(6)
    expect(handle().input.state.shown).toBe(true)
    expect(handle().state.buttons[1]!.kick).toBeLessThan(0.2)
    w.unmount()
  })

  it(':goo="false" is a plain shadcn NumberField; toggles reach core', async () => {
    const w = mount(numberField({ goo: false }), { attachTo: document.body })
    await flushPromises()
    expect(layers(w.element.parentElement!)).toHaveLength(0)
    expect(w.get('input').classes()).not.toContain('focus-visible:ring-0')
    expect(w.get('input').classes()).toContain('focus-visible:ring-3')
    w.unmount()

    const model = ref<number | undefined>(5)
    const u = mount(numberField({ nudge: false }, model), { attachTo: document.body })
    await flushPromises()
    u.get('[data-slot="increment"]').element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }))
    await flushPromises()
    expect(model.value).toBe(6)
    const handle = (u.findComponent(GoopNumberFieldContent).vm as unknown as { handle: NumberFieldHandleLike }).handle
    expect(handle.state.buttons[1]!.kick).toBe(Infinity)
    u.unmount()
  })

  it('reduced motion: static goo, nothing runs', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(numberField(), { attachTo: document.body })
    await flushPromises()
    const handle = (w.findComponent(GoopNumberFieldContent).vm as unknown as { handle: NumberFieldHandleLike }).handle
    expect(handle.reducedMotion).toBe(true)
    w.get('[data-slot="increment"]').element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }))
    await flushPromises()
    expect(handle.running).toBe(false)
    expect(handle.state.buttons[1]!.kick).toBe(Infinity)
    w.unmount()
  })

  it('SSR renders no goo layer', async () => {
    const html = await renderToString(createSSRApp(numberField()))
    expect(html).toContain('data-slot="number-field-content"')
    expect(html).not.toContain('data-goop="layer"')
  })
})

type OtpHandleLike = { active: number; running: boolean; reducedMotion: boolean; pose: { levels: number[] } | null }

const otp = (props: Record<string, unknown> = {}, model = ref<string[]>([])) =>
  defineComponent(() => () =>
    h(
      GoopInputOTP as never,
      { ...props, modelValue: model.value, 'onUpdate:modelValue': (v: string[]) => (model.value = v), ref: 'otp' },
      {
        default: () => [
          h(GoopInputOTPGroup, null, { default: () => [0, 1, 2].map((i) => h(GoopInputOTPSlot, { index: i })) }),
          h(GoopInputOTPSeparator),
          h(GoopInputOTPGroup, null, { default: () => [3, 4, 5].map((i) => h(GoopInputOTPSlot, { index: i })) }),
        ],
      },
    ),
  )

describe('GoopInputOTP', () => {
  it('is in the manifest with every part', () => {
    for (const n of ['GoopInputOTP', 'GoopInputOTPGroup', 'GoopInputOTPSlot', 'GoopInputOTPSeparator']) expect(goopComponents).toContain(n)
  })

  it('maps props to core options', () => {
    const o = toInputOTPOptions({ pulse: false, flow: 0.5 })
    expect(o).toMatchObject({ pulse: false, flow: 0.5 })
    for (const k of ['flood', 'flow', 'wobble', 'pulse', 'speed', 'preset', 'renderer']) expect(goopInputOTPProps).toHaveProperty(k)
  })

  it('renders six labelled cells, a separator and one aria-hidden goo layer', async () => {
    const w = mount(otp(), { attachTo: document.body })
    await flushPromises()
    const cells = w.findAll('input[data-slot="input-otp-slot"]')
    expect(cells).toHaveLength(6)
    expect(cells[0]!.attributes('aria-label')).toBeTruthy()
    expect(cells[0]!.attributes('autocomplete')).toBe('one-time-code')
    expect(cells[0]!.classes()).toContain('focus:ring-0')
    expect(w.get('[data-slot="input-otp-separator"]').attributes('role')).toBe('separator')
    const root = w.get('[data-slot="input-otp"]')
    expect(root.attributes()).toHaveProperty('data-goop-active')
    const ls = layers(root.element)
    expect(ls).toHaveLength(1)
    expect(ls[0]!.getAttribute('aria-hidden')).toBe('true')
    w.unmount()
  })

  it('typing moves the focus goo to the next cell, Backspace moves it back', async () => {
    const model = ref<string[]>([])
    const w = mount(otp({}, model), { attachTo: document.body })
    await flushPromises()
    const handle = () => (w.findComponent(GoopInputOTP).vm as unknown as { handle: OtpHandleLike }).handle
    const cells = w.findAll('input[data-slot="input-otp-slot"]')
    ;(cells[0]!.element as HTMLInputElement).focus()
    expect(handle().active).toBe(0)
    await cells[0]!.setValue('4')
    await flushPromises()
    expect(model.value[0]).toBe('4')
    expect(document.activeElement).toBe(cells[1]!.element)
    expect(handle().active).toBe(1)
    expect(handle().running).toBe(true)
    await cells[1]!.trigger('keydown', { key: 'Backspace' })
    await flushPromises()
    expect(document.activeElement).toBe(cells[0]!.element)
    expect(handle().active).toBe(0)
    w.unmount()
  })

  it(':goo="false" is plain; reduced motion is static', async () => {
    const w = mount(otp({ goo: false }), { attachTo: document.body })
    await flushPromises()
    expect(layers(w.element.parentElement!)).toHaveLength(0)
    expect(w.get('input').classes()).toContain('focus:ring-3')
    expect(w.get('input').classes()).not.toContain('focus:ring-0')
    w.unmount()

    document.documentElement.dataset.reducedMotion = 'true'
    const u = mount(otp(), { attachTo: document.body })
    await flushPromises()
    const handle = (u.findComponent(GoopInputOTP).vm as unknown as { handle: OtpHandleLike }).handle
    ;(u.findAll('input')[2]!.element as HTMLInputElement).focus()
    await nextTick()
    expect(handle.reducedMotion).toBe(true)
    expect(handle.running).toBe(false)
    expect(handle.pose!.levels[2]).toBe(1)
    u.unmount()
  })

  it('SSR renders no goo layer', async () => {
    const html = await renderToString(createSSRApp(otp()))
    expect(html).toContain('data-slot="input-otp"')
    expect(html).not.toContain('data-goop="layer"')
  })
})

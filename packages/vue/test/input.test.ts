import { INPUT_DRIP_CIRCLES, INPUT_RING_MIN } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { GoopInput, GoopTextarea, goopComponents, goopInputProps, toInputOptions } from '../src'

const layers = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="layer"]')
const blobs = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="blob"]')

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopInput / GoopTextarea', () => {
  it('are in the manifest', () => {
    expect(goopComponents).toContain('GoopInput')
    expect(goopComponents).toContain('GoopTextarea')
  })

  it('maps props to core options (undefined effects stay out)', () => {
    const o = toInputOptions({ ripple: false, drips: true, speed: 2 })
    expect(o).toMatchObject({ ripple: false, drips: true, speed: 2 })
    expect('flow' in o).toBe(false)
    for (const k of ['flow', 'close', 'ripple', 'wobble', 'drain', 'drip', 'drips', 'speed', 'preset', 'renderer']) {
      expect(goopInputProps).toHaveProperty(k)
    }
  })

  it('renders shadcn classes on the input, attrs pass through, one aria-hidden goo layer', async () => {
    const w = mount(GoopInput, {
      props: { class: 'max-w-sm' },
      attrs: { placeholder: 'Email', type: 'email', 'aria-invalid': 'true' },
      attachTo: document.body,
    })
    await nextTick()
    const input = w.get('input')
    expect(input.attributes('data-slot')).toBe('input')
    expect(input.attributes('placeholder')).toBe('Email')
    expect(input.attributes('type')).toBe('email')
    expect(input.classes()).toContain('max-w-sm')
    expect(input.classes()).toContain('rounded-lg')
    expect(input.classes()).toContain('aria-invalid:border-destructive')
    // The goo ring replaces shadcn's box-shadow ring.
    expect(input.classes()).toContain('focus-visible:ring-0')
    const wrap = w.get('[data-slot="input-goo"]')
    expect(wrap.attributes()).toHaveProperty('data-goop-active')
    expect(wrap.attributes('placeholder')).toBeUndefined()
    const ls = layers(wrap.element)
    expect(ls).toHaveLength(1)
    expect(ls[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(blobs(wrap.element).length).toBeGreaterThanOrEqual(INPUT_RING_MIN + INPUT_DRIP_CIRCLES)
    expect((w.vm as unknown as { handle: { state: { invalid: boolean } } }).handle.state.invalid).toBe(true)
    w.unmount()
  })

  it('v-model and defaultValue', async () => {
    const value = ref('hi')
    const App = defineComponent(() => () => h(GoopInput as never, { modelValue: value.value, 'onUpdate:modelValue': (v: string | number) => (value.value = String(v)) }))
    const w = mount(App, { attachTo: document.body })
    const input = w.get('input')
    expect((input.element as HTMLInputElement).value).toBe('hi')
    await input.setValue('goo')
    expect(value.value).toBe('goo')
    value.value = 'back'
    await nextTick()
    expect((input.element as HTMLInputElement).value).toBe('back')
    w.unmount()

    const u = mount(GoopTextarea, { props: { defaultValue: 'start' }, attachTo: document.body })
    expect((u.get('textarea').element as HTMLTextAreaElement).value).toBe('start')
    expect(u.get('textarea').classes()).toContain('field-sizing-content')
    u.unmount()
  })

  it('focus shows the ring and blur drains it; :goo="false" is a plain field', async () => {
    const w = mount(GoopTextarea, { attachTo: document.body })
    const handle = () => (w.vm as unknown as { handle: { state: { shown: boolean } } | null }).handle
    await w.get('textarea').trigger('focus')
    expect(handle()!.state.shown).toBe(true)
    await w.get('textarea').trigger('blur')
    expect(handle()!.state.shown).toBe(false)
    await w.setProps({ goo: false })
    await flushPromises()
    expect(w.find('[data-slot="textarea-goo"]').exists()).toBe(false)
    expect(layers(w.element.parentElement ?? document.body)).toHaveLength(0)
    expect(handle()).toBe(null)
    w.unmount()
  })

  it('passes effect toggles through to core live', async () => {
    const w = mount(GoopInput, { props: { wobble: false }, attachTo: document.body })
    const vm = w.vm as unknown as { handle: { update: (o: object) => void } }
    const spy = vi.spyOn(vm.handle, 'update')
    await w.setProps({ ripple: false })
    await flushPromises()
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ ripple: false, wobble: false }))
    w.unmount()
  })

  it('SSR renders the plain markup and hydrates without mismatches', async () => {
    const App = defineComponent(() => () => h('div', [h(GoopInput, { placeholder: 'a' }), h(GoopTextarea, { placeholder: 'b' })]))
    const html = await renderToString(createSSRApp(App))
    expect(html).toContain('data-slot="input-goo"')
    expect(html).toContain('data-slot="textarea"')
    expect(html).not.toContain('data-goop="layer"')
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
    expect(layers(root)).toHaveLength(2)
    app.unmount()
  })
})

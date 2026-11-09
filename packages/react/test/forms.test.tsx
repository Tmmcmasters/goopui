// Client tests for the React forms batch: Input, Textarea, RadioGroup, Slider, Progress,
// Toggle, ToggleGroup. Each renders shadcn/ui's markup (Radix), keeps engine props off the DOM,
// and attaches the same core engine as @goopui/vue with the same options.
import {
  PROGRESS_CIRCLES,
  RADIO_CIRCLES,
  SLIDER_FILL_SEGMENTS,
  activeTickerCount,
  type InputHandle,
  type ProgressHandle,
  type RadioGroupHandle,
  type SliderHandle,
  type ToggleHandle,
} from '@goopui/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as vue from '../../vue/src/goop-props'
import {
  GoopInput,
  GoopProgress,
  GoopProvider,
  GoopRadioGroup,
  GoopRadioGroupItem,
  GoopSlider,
  GoopTextarea,
  GoopToggle,
  GoopToggleGroup,
  GoopToggleGroupItem,
  INPUT_PROP_KEYS,
  PROGRESS_PROP_KEYS,
  RADIO_PROP_KEYS,
  SLIDER_PROP_KEYS,
  TOGGLE_GROUP_PROP_KEYS,
  TOGGLE_PROP_KEYS,
  goopComponents,
  toInputOptions,
  toProgressOptions,
  toRadioOptions,
  toSliderOptions,
  toToggleGroupOptions,
  toToggleOptions,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const layers = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="layer"]')
const blobs = (el: Element) => el.querySelectorAll<HTMLElement>('[data-goop="blob"]')
const noEngineAttrs = (el: Element, keys: readonly string[]) => {
  for (const k of keys) expect(el.hasAttribute(k), k).toBe(false)
}

describe('forms batch: props', () => {
  it('lists the same engine props as @goopui/vue and maps them the same way', () => {
    expect([...INPUT_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopInputProps).sort())
    expect([...RADIO_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopRadioProps).sort())
    expect([...SLIDER_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopSliderProps).sort())
    expect([...PROGRESS_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopProgressProps).sort())
    expect([...TOGGLE_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopToggleProps).sort())
    expect([...TOGGLE_GROUP_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopToggleGroupProps).sort())
    const config = { preset: 'wild' as const, seed: 7, reducedMotion: true }
    expect(toInputOptions({ flow: false, drips: 2, speed: 2 }, config)).toEqual(vue.toInputOptions({ flow: false, drips: 2, speed: 2 }, config))
    expect(toRadioOptions({ bridge: 0.5 }, config)).toEqual(vue.toRadioOptions({ bridge: 0.5 }, config))
    expect(toSliderOptions({ jelly: false, renderer: 'canvas' }, config)).toEqual(vue.toSliderOptions({ jelly: false, renderer: 'canvas' }, config))
    expect(toProgressOptions({ drips: false }, config)).toEqual(vue.toProgressOptions({ drips: false }, config))
    expect(toProgressOptions({ seed: 3 }).seed).toBe(3)
    expect(toToggleOptions({ flood: false, textFollow: false }, config)).toEqual(vue.toToggleOptions({ flood: false, textFollow: false }, config))
    expect(toToggleGroupOptions({ merge: false, flow: 2 }, config)).toEqual(vue.toToggleGroupOptions({ merge: false, flow: 2 }, config))
  })

  it('every forms component is in the manifest', () => {
    for (const n of ['GoopInput', 'GoopTextarea', 'GoopRadioGroup', 'GoopRadioGroupItem', 'GoopSlider', 'GoopProgress', 'GoopToggle', 'GoopToggleGroup', 'GoopToggleGroupItem'])
      expect(goopComponents).toContain(n)
  })
})

describe('GoopInput / GoopTextarea', () => {
  it("is shadcn's input in a goo wrapper: ref is the input, props pass through, one aria-hidden layer", () => {
    const ref = createRef<HTMLInputElement>()
    const api = createRef<InputHandle>()
    const r = render(h(GoopInput, { ref, goopRef: api, type: 'email', placeholder: 'you@example.com', className: 'max-w-xs', containerClassName: 'mx-auto', ripple: false, 'aria-invalid': true }))
    const input = ref.current!
    expect(input.tagName).toBe('INPUT')
    expect(input.type).toBe('email')
    expect(input.dataset.slot).toBe('input')
    expect(input.className).toContain('rounded-lg')
    expect(input.className).toContain('max-w-xs')
    expect(input.className).toContain('focus-visible:ring-0') // the goo ring replaces shadcn's
    expect(input.getAttribute('aria-invalid')).toBe('true')
    noEngineAttrs(input, ['ripple', 'containerclassname'])
    const host = input.parentElement!
    expect(host.dataset.slot).toBe('input-goo')
    expect(host.dataset.goopHost).toBe('input')
    expect(host.hasAttribute('data-goop-active')).toBe(true)
    expect(host.className).toContain('w-full')
    expect(host.className).toContain('mx-auto')
    expect(layers(host)).toHaveLength(1)
    expect(layers(host)[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(api.current).not.toBeNull()
    r.unmount()
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('works controlled and uncontrolled; focus and typing drive the ring', () => {
    const onChange = vi.fn()
    function Controlled() {
      const [v, setV] = useState('a')
      return h(GoopInput, { value: v, onChange: (e: { target: { value: string } }) => (setV(e.target.value), onChange(e.target.value)), 'aria-label': 'c' } as never)
    }
    const api = createRef<InputHandle>()
    render(h('div', null, h(Controlled), h(GoopInput, { defaultValue: 'x', 'aria-label': 'u', goopRef: api })))
    const c = screen.getByLabelText('c') as HTMLInputElement
    fireEvent.change(c, { target: { value: 'ab' } })
    expect(onChange).toHaveBeenCalledWith('ab')
    expect(c.value).toBe('ab')
    const u = screen.getByLabelText('u') as HTMLInputElement
    expect(u.value).toBe('x')
    act(() => u.focus())
    expect(api.current!.running).toBe(true)
  })

  it('goo={false} is a plain shadcn input (no wrapper); textarea is the same', () => {
    const t = createRef<HTMLTextAreaElement>()
    render(h('div', null, h(GoopInput, { goo: false, 'aria-label': 'plain' }), h(GoopTextarea, { ref: t, rows: 3, flow: false })))
    const plain = screen.getByLabelText('plain')
    expect(plain.parentElement!.dataset.slot).toBeUndefined()
    expect(plain.className).not.toContain('focus-visible:ring-0')
    const ta = t.current!
    expect(ta.tagName).toBe('TEXTAREA')
    expect(ta.dataset.slot).toBe('textarea')
    expect(ta.className).toContain('field-sizing-content')
    expect(ta.parentElement!.dataset.slot).toBe('textarea-goo')
    expect(ta.parentElement!.hasAttribute('data-goop-active')).toBe(true)
    noEngineAttrs(ta, ['flow'])
  })
})

describe('GoopRadioGroup', () => {
  const Group = (extra: Record<string, unknown> = {}) =>
    h(GoopRadioGroup, { defaultValue: 'a', 'aria-label': 'g', ...extra }, ['a', 'b', 'c'].map((v) => h(GoopRadioGroupItem, { key: v, value: v, 'aria-label': v })))

  it('renders Radix radios with shadcn classes and one goo layer on the root', () => {
    const api = createRef<RadioGroupHandle>()
    const r = render(Group({ goopRef: api, className: 'gap-4', splat: false }))
    const root = screen.getByRole('radiogroup')
    expect(root.dataset.slot).toBe('radio-group')
    expect(root.className).toContain('w-full')
    expect(root.className).toContain('gap-4')
    expect(root.className).toContain('[--goop-radio-fill:var(--primary)]')
    expect(root.hasAttribute('data-goop-active')).toBe(true)
    expect(blobs(root)).toHaveLength(RADIO_CIRCLES)
    noEngineAttrs(root, ['splat'])
    const items = screen.getAllByRole('radio')
    expect(items[0]!.dataset.slot).toBe('radio-group-item')
    expect(items[0]!.getAttribute('aria-checked')).toBe('true')
    expect(items[0]!.className).toContain('data-[state=checked]:bg-transparent')
    expect(items[0]!.querySelector('[data-slot="radio-group-indicator"]')!.hasAttribute('data-goop-mark')).toBe(true)
    expect(api.current).not.toBeNull()
    r.unmount()
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('a click selects and the blob flies there; onValueChange fires', () => {
    const onValueChange = vi.fn()
    const api = createRef<RadioGroupHandle>()
    render(Group({ onValueChange, goopRef: api }))
    act(() => fireEvent.click(screen.getByLabelText('c')))
    expect(onValueChange).toHaveBeenCalledWith('c')
    expect(screen.getByLabelText('c').getAttribute('aria-checked')).toBe('true')
    expect(api.current!.running).toBe(true)
  })

  it('goo={false} is plain shadcn: items keep their fill', () => {
    render(Group({ goo: false }))
    const root = screen.getByRole('radiogroup')
    expect(root.hasAttribute('data-goop-host')).toBe(false)
    expect(layers(root)).toHaveLength(0)
    expect(screen.getAllByRole('radio')[0]!.className).not.toContain('data-[state=checked]:bg-transparent')
  })
})

describe('GoopSlider', () => {
  it('renders shadcn parts, one thumb per value; the goo draws range and thumbs', () => {
    const api = createRef<SliderHandle>()
    const r = render(h(GoopSlider, { defaultValue: [20, 80], className: 'w-40', goopRef: api, jelly: false }))
    const root = document.querySelector<HTMLElement>('[data-slot="slider"]')!
    expect(root.className).toContain('w-40')
    expect(root.dataset.orientation).toBe('horizontal')
    expect(screen.getAllByRole('slider')).toHaveLength(2)
    expect(root.hasAttribute('data-goop-active')).toBe(true)
    expect(blobs(root)).toHaveLength(SLIDER_FILL_SEGMENTS + 4)
    expect(document.querySelector<HTMLElement>('[data-slot="slider-range"]')!.style.backgroundColor).toBe('transparent')
    expect(document.querySelector<HTMLElement>('[data-slot="slider-thumb"]')!.style.borderColor).toBe('transparent')
    noEngineAttrs(root, ['jelly'])
    expect(api.current).not.toBeNull()
    r.unmount()
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('like shadcn: no value is a min..max range; vertical; keyboard steps it', () => {
    const onValueChange = vi.fn()
    render(h('div', null, h(GoopSlider, { 'data-testid': 'range' } as never), h(GoopSlider, { defaultValue: [50], orientation: 'vertical', onValueChange })))
    expect(screen.getByTestId('range').querySelectorAll('[role="slider"]')).toHaveLength(2)
    const vertical = document.querySelectorAll<HTMLElement>('[data-slot="slider"]')[1]!
    expect(vertical.dataset.orientation).toBe('vertical')
    const thumb = vertical.querySelector<HTMLElement>('[role="slider"]')!
    act(() => fireEvent.keyDown(thumb, { key: 'ArrowUp' }))
    expect(onValueChange).toHaveBeenCalledWith([51])
  })

  it('goo={false} is a plain shadcn Slider', () => {
    render(h(GoopSlider, { defaultValue: [50], goo: false }))
    const root = document.querySelector<HTMLElement>('[data-slot="slider"]')!
    expect(root.hasAttribute('data-goop-host')).toBe(false)
    expect(layers(root)).toHaveLength(0)
    expect(document.querySelector<HTMLElement>('[data-slot="slider-thumb"]')!.getAttribute('style') ?? '').not.toContain('transparent')
  })
})

describe('GoopProgress', () => {
  it("is shadcn's progress with a liquid layer; value reaches the engine; null is indeterminate", () => {
    const api = createRef<ProgressHandle>()
    const view = (value: number | null) => h(GoopProgress, { value, goopRef: api, className: 'w-40', drips: false, slosh: false })
    const r = render(view(40))
    const root = screen.getByRole('progressbar')
    expect(root.dataset.slot).toBe('progress')
    expect(root.className).toContain('w-40')
    expect(root.getAttribute('aria-valuenow')).toBe('40')
    expect(root.hasAttribute('data-goop-active')).toBe(true)
    expect(blobs(root)).toHaveLength(PROGRESS_CIRCLES)
    const indicator = root.querySelector<HTMLElement>('[data-slot="progress-indicator"]')!
    expect(indicator.style.transform).toBe('translateX(-60%)')
    expect(indicator.style.backgroundColor).toBe('transparent')
    noEngineAttrs(root, ['drips', 'slosh'])
    r.rerender(view(90))
    expect(root.getAttribute('aria-valuenow')).toBe('90')
    expect(api.current!.running).toBe(true)
    r.rerender(view(null))
    expect(root.dataset.state).toBe('indeterminate')
    r.unmount()
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('goo={false} is plain shadcn; reduced motion keeps the liquid still', () => {
    render(h(GoopProgress, { value: 30, goo: false }))
    expect(layers(screen.getByRole('progressbar'))).toHaveLength(0)
    document.body.innerHTML = ''
    render(h(GoopProvider, { reducedMotion: true }, h(GoopProgress, { value: 30 })))
    expect(blobs(screen.getByRole('progressbar'))).toHaveLength(PROGRESS_CIRCLES)
    expect(activeTickerCount()).toBe(0)
  })
})

describe('GoopToggle', () => {
  it("is shadcn's toggle with one aria-hidden goo layer and floods on press", () => {
    const onPressedChange = vi.fn()
    const api = createRef<ToggleHandle>()
    const r = render(h(GoopToggle, { variant: 'outline', size: 'sm', onPressedChange, goopRef: api, droplets: false, 'aria-label': 'Bold' }, 'B'))
    const btn = screen.getByRole('button')
    expect(btn.dataset.slot).toBe('toggle')
    expect(btn.className).toContain('border-input')
    expect(btn.className).toContain('h-7')
    expect(btn.className).toContain('data-[state=on]:bg-transparent')
    expect(btn.className).toContain('[--goop-toggle-fill:var(--muted)]')
    expect(btn.hasAttribute('data-goop-active')).toBe(true)
    expect(layers(btn)).toHaveLength(1)
    expect(layers(btn)[0]!.getAttribute('aria-hidden')).toBe('true')
    noEngineAttrs(btn, ['droplets'])
    act(() => fireEvent.click(btn))
    expect(onPressedChange).toHaveBeenCalledWith(true)
    expect(btn.dataset.state).toBe('on')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(api.current!.running).toBe(true)
    r.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it('goo={false} is a plain shadcn toggle; controlled `pressed` wins', () => {
    render(h('div', null, h(GoopToggle, { goo: false, 'aria-label': 'plain' }), h(GoopToggle, { pressed: true, 'aria-label': 'on' })))
    const plain = screen.getByLabelText('plain')
    expect(layers(plain)).toHaveLength(0)
    expect(plain.className).not.toContain('--goop-toggle-fill')
    const on = screen.getByLabelText('on')
    act(() => fireEvent.click(on))
    expect(on.dataset.state).toBe('on')
  })
})

describe('GoopToggleGroup', () => {
  const Group = (type: 'single' | 'multiple', defaultValue: string | string[], extra: Record<string, unknown> = {}) =>
    h(
      GoopToggleGroup,
      { type, defaultValue, variant: 'outline', 'aria-label': 'g', ...extra } as never,
      ['a', 'b', 'c'].map((v) => h(GoopToggleGroupItem, { key: v, value: v, 'aria-label': v }, v.toUpperCase())),
    )

  it('shares variant with items, one goo layer on the root; items drop their pressed bg', () => {
    const api = createRef<ToggleHandle>()
    const r = render(Group('single', 'a', { goopRef: api, spacing: 2, merge: false }))
    const root = document.querySelector<HTMLElement>('[data-slot="toggle-group"]')!
    expect(root.dataset.slot).toBe('toggle-group')
    expect(root.dataset.variant).toBe('outline')
    expect(root.dataset.spacing).toBe('2')
    expect(root.dataset.orientation).toBe('horizontal')
    expect(root.style.getPropertyValue('--gap')).toBe('2')
    expect(root.className).toContain('w-fit')
    expect(root.hasAttribute('data-goop-active')).toBe(true)
    expect(layers(root)).toHaveLength(1)
    noEngineAttrs(root, ['merge'])
    const a = screen.getByLabelText('a')
    expect(a.dataset.slot).toBe('toggle-group-item')
    expect(a.dataset.variant).toBe('outline')
    expect(a.className).toContain('border-input')
    expect(a.className).toContain('data-[goop-filled]:hover:bg-transparent')
    expect(api.current!.pose?.levels).toEqual([1, 0, 0])
    r.unmount()
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('single: selecting another item flows the goo there (Radix single items are role="radio")', () => {
    const api = createRef<ToggleHandle>()
    const onValueChange = vi.fn()
    render(Group('single', 'a', { goopRef: api, onValueChange }))
    act(() => fireEvent.click(screen.getByLabelText('c')))
    expect(onValueChange).toHaveBeenCalledWith('c')
    expect(screen.getByLabelText('c').dataset.state).toBe('on')
    expect(api.current!.running).toBe(true)
  })

  it('multiple: pressing items floods them; reduced motion shows them still', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const api = createRef<ToggleHandle>()
    render(Group('multiple', ['a'], { goopRef: api }))
    act(() => fireEvent.click(screen.getByLabelText('b')))
    expect(api.current!.pose?.levels).toEqual([1, 1, 0])
    expect(api.current!.running).toBe(false)
  })

  it('goo={false} is a plain shadcn ToggleGroup', () => {
    render(Group('multiple', [], { goo: false }))
    const root = document.querySelector<HTMLElement>('[data-slot="toggle-group"]')!
    expect(root.hasAttribute('data-goop-host')).toBe(false)
    expect(layers(root)).toHaveLength(0)
    expect(screen.getByLabelText('a').className).not.toContain('data-[goop-filled]')
  })
})

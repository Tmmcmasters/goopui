// Client tests for React bespoke batch 1: Toaster (sonner), Command (cmdk), Combobox (cmdk +
// Popover), NumberField and InputOTP (input-otp). Each renders shadcn/ui's markup, keeps engine
// props off the DOM, and attaches the same core engine as @goopui/vue.
import type { EmergeHandle, InputOTPHandle, MenuHighlightHandle, NumberFieldHandle, ToasterHandle } from '@goopui/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef, useState } from 'react'
import { toast } from 'sonner'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  GoopCombobox,
  GoopComboboxAnchor,
  GoopComboboxEmpty,
  GoopComboboxGroup,
  GoopComboboxInput,
  GoopComboboxItem,
  GoopComboboxItemIndicator,
  GoopComboboxList,
  GoopComboboxTrigger,
  GoopCommand,
  GoopCommandDialog,
  GoopCommandEmpty,
  GoopCommandGroup,
  GoopCommandInput,
  GoopCommandItem,
  GoopCommandList,
  GoopCommandSeparator,
  GoopCommandShortcut,
  GoopInputOTP,
  GoopInputOTPGroup,
  GoopInputOTPSeparator,
  GoopInputOTPSlot,
  GoopNumberField,
  GoopNumberFieldContent,
  GoopNumberFieldDecrement,
  GoopNumberFieldIncrement,
  GoopNumberFieldInput,
  GoopProvider,
  GoopToaster,
  goopComponents,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

beforeAll(() => {
  // cmdk scrolls the selected item into view; happy-dom has no layout.
  Element.prototype.scrollIntoView ??= function () {}
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
  vi.useRealTimers()
})

const noEngineAttrs = (el: Element, re: RegExp) => expect(el.getAttributeNames().some((n) => re.test(n))).toBe(false)
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)))

// ---- Toaster ------------------------------------------------------------------------------------

describe('GoopToaster', () => {
  it("is shadcn's Sonner with the goo attached after mount", async () => {
    const ref = createRef<HTMLElement>()
    const api = createRef<ToasterHandle>()
    render(h(GoopToaster, { ref, goopRef: api, dropIn: false, speed: 2 } as never))
    const section = ref.current!
    expect(section.tagName).toBe('SECTION')
    expect(section.getAttribute('aria-label')).toContain('Notifications')
    expect(api.current).not.toBeNull()
    noEngineAttrs(section, /^(speed|dropin|drop-in)$/i)
    await act(async () => {
      toast('Saved')
      await new Promise((r) => setTimeout(r, 20))
    })
    const t = document.querySelector('[data-sonner-toast]') as HTMLElement
    expect(t).not.toBeNull()
    expect(t.className).toContain('rounded-2xl')
    expect(document.querySelector('[data-sonner-toaster]')!.className).toContain('toaster')
    act(() => toast.dismiss())
  })

  it('goo={false} is plain shadcn Sonner (no handle)', () => {
    const api = createRef<ToasterHandle>()
    render(h(GoopToaster, { goo: false, goopRef: api }))
    expect(api.current).toBeNull()
  })
})

// ---- Command ------------------------------------------------------------------------------------

const suggestions = ['Calendar', 'Search Emoji', 'Calculator']
const commandView = (props: Record<string, unknown> = {}, list: Record<string, unknown> = {}) =>
  h(
    GoopCommand,
    { className: 'w-80', ...props },
    h(GoopCommandInput, { placeholder: 'Search...' }),
    h(
      GoopCommandList,
      list,
      h(GoopCommandEmpty, null, 'No results found.'),
      h(GoopCommandGroup, { heading: 'Suggestions' }, ...suggestions.map((s) => h(GoopCommandItem, { key: s, value: s }, s))),
      h(GoopCommandSeparator),
      h(GoopCommandGroup, { heading: 'Settings' }, h(GoopCommandItem, { value: 'Profile' }, 'Profile', h(GoopCommandShortcut, null, '⌘P'))),
    ),
  )

describe('GoopCommand', () => {
  it("renders shadcn's Command on cmdk, the goo highlight in cmdk's list and the goo ring on the input", async () => {
    const hl = createRef<MenuHighlightHandle>()
    render(commandView({ speed: 2, preset: 'wild' }, { goopRef: hl }))
    await flush()
    const root = document.querySelector('[data-slot="command"]')!
    expect(root.hasAttribute('cmdk-root')).toBe(true)
    expect(root.className).toContain('bg-popover')
    noEngineAttrs(root, /^(speed|preset)$/)
    const sizer = document.querySelector('[data-slot="command-list"] > [cmdk-list-sizer]')!
    expect(sizer.querySelector(':scope > [data-goop="highlight"]')).not.toBeNull()
    expect(hl.current).not.toBeNull()
    // cmdk selects the first item; the blob follows it.
    const first = screen.getByText('Calendar').closest('[cmdk-item]')!
    expect(first.getAttribute('data-selected')).toBe('true')
    expect(hl.current!.target).toBe(first)
    // The goo replaces the flat bg.
    expect(first.className).not.toContain('data-[selected=true]:bg-muted')
    const input = screen.getByPlaceholderText('Search...')
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    const second = screen.getByText('Search Emoji').closest('[cmdk-item]')!
    expect(second.getAttribute('data-selected')).toBe('true')
    expect(hl.current!.target).toBe(second)
    // Ring host around the input.
    expect(document.querySelector('[data-slot="command-input-goo"]')!.hasAttribute('data-goop-active')).toBe(true)
    expect(document.querySelector('[data-slot="command-group"] [cmdk-group-heading]')!.textContent).toBe('Suggestions')
  })

  it('filters as you type; Empty shows only for a search that matches nothing', async () => {
    render(commandView())
    await flush()
    expect(screen.queryByText('No results found.')).toBeNull()
    const input = screen.getByPlaceholderText('Search...')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'calc' } })
    })
    await flush()
    expect(screen.queryByText('Calendar')).toBeNull()
    expect(screen.getByText('Calculator')).toBeTruthy()
    await act(async () => {
      fireEvent.change(input, { target: { value: 'zzzz' } })
    })
    await flush()
    expect(screen.getByText('No results found.')).toBeTruthy()
  })

  it('ignoreFilter renders every item as given (cmdk shouldFilter={false})', async () => {
    render(commandView({ ignoreFilter: true }))
    await flush()
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'zzzz' } })
    })
    await flush()
    for (const s of suggestions) expect(screen.getByText(s)).toBeTruthy()
    expect(screen.queryByText('No results found.')).toBeNull()
  })

  it('choosing an item calls onSelect and squishes the blob', async () => {
    const hl = createRef<MenuHighlightHandle>()
    const onSelect = vi.fn()
    render(h(GoopCommand, null, h(GoopCommandList, { goopRef: hl }, h(GoopCommandItem, { value: 'One', onSelect }, 'One'))))
    await flush()
    const pop = vi.spyOn(hl.current!, 'pop')
    await act(async () => {
      fireEvent.click(screen.getByText('One'))
    })
    expect(onSelect).toHaveBeenCalledWith('One')
    expect(pop).toHaveBeenCalled()
  })

  it("goo={false} is plain shadcn Command (flat highlight, no ring); highlight={false} keeps the ring", async () => {
    render(h('div', null, h('div', { 'data-testid': 'off' }, commandView({ goo: false })), h('div', { 'data-testid': 'hl' }, commandView({ highlight: false }))))
    await flush()
    const off = screen.getByTestId('off')
    expect(off.querySelector('[data-goop]')).toBeNull()
    expect(off.querySelector('[cmdk-item]')!.className).toContain('data-[selected=true]:bg-muted')
    const hl = screen.getByTestId('hl')
    expect(hl.querySelector('[data-goop="highlight"]')).toBeNull()
    expect(hl.querySelector('[data-slot="command-input-goo"]')!.hasAttribute('data-goop-active')).toBe(true)
  })

  it('GoopCommandDialog opens a Command in a goo dialog', async () => {
    const App = () => {
      const [open, setOpen] = useState(true)
      return h(GoopCommandDialog, { open, onOpenChange: setOpen }, h(GoopCommandInput, { placeholder: 'Type' }), h(GoopCommandList, null, h(GoopCommandItem, { value: 'A' }, 'A')))
    }
    render(h(App))
    await flush()
    const content = document.querySelector('[data-slot="dialog-content"]')!
    expect(content.querySelector('[data-slot="command"]')).not.toBeNull()
    expect(content.querySelector(':scope > [data-goop="surface"]')).not.toBeNull()
    expect(content.textContent).toContain('Command Palette')
  })

  it('is in the manifest with every part', () => {
    for (const n of ['GoopCommand', 'GoopCommandDialog', 'GoopCommandEmpty', 'GoopCommandGroup', 'GoopCommandInput', 'GoopCommandItem', 'GoopCommandList', 'GoopCommandSeparator', 'GoopCommandShortcut'])
      expect(goopComponents).toContain(n)
  })
})

// ---- Combobox -----------------------------------------------------------------------------------

const frameworks = [
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'next', label: 'Next.js' },
  { value: 'astro', label: 'Astro' },
]
const label = (v: string) => frameworks.find((f) => f.value === v)?.label ?? ''

function ComboboxApp(props: { list?: Record<string, unknown>; onValueChange?: (v: string) => void }) {
  const [value, setValue] = useState('')
  return h(
    GoopCombobox,
    {
      value,
      onValueChange: (v: string) => {
        setValue(v)
        props.onValueChange?.(v)
      },
    },
    h(GoopComboboxAnchor, { className: 'relative w-56' }, h(GoopComboboxInput, { placeholder: 'Select framework...', displayValue: label }), h(GoopComboboxTrigger, { 'aria-label': 'Show frameworks' })),
    h(
      GoopComboboxList,
      props.list ?? {},
      h(GoopComboboxEmpty, null, 'No framework found.'),
      h(GoopComboboxGroup, null, ...frameworks.map((f) => h(GoopComboboxItem, { key: f.value, value: f.value, keywords: [f.label] }, f.label, h(GoopComboboxItemIndicator)))),
    ),
  )
}

describe('GoopCombobox', () => {
  it('the chevron opens a goo list under the anchor; choosing sets the value, plops the check and closes after the pop', async () => {
    const onValueChange = vi.fn()
    const emerge = createRef<EmergeHandle>()
    const hl = createRef<MenuHighlightHandle>()
    render(h(ComboboxApp, { onValueChange, list: { goopRef: emerge, highlightRef: hl } }))
    const trigger = screen.getByLabelText('Show frameworks')
    expect(trigger.className).toContain('min-w-8')
    expect(trigger.querySelector('path')!.getAttribute('d')).toBe('m6 9 6 6 6-6')
    await act(async () => {
      fireEvent.click(trigger)
    })
    await flush()
    const list = document.querySelector('[data-slot="combobox-list"]') as HTMLElement
    expect(list).not.toBeNull()
    expect(list.querySelector(':scope > [data-goop="surface"]')).not.toBeNull()
    expect(emerge.current).not.toBeNull()
    expect(list.querySelector('[cmdk-list-sizer] > [data-goop="highlight"]')).not.toBeNull()
    const ms = vi.spyOn(hl.current!, 'pop').mockReturnValue(300) // long enough for slow CI runners to assert before the close
    await act(async () => {
      fireEvent.click(screen.getByText('Next.js'))
    })
    expect(ms).toHaveBeenCalled()
    expect(onValueChange).toHaveBeenCalledWith('next')
    // The value is set at once (its check mark shows), the list closes once the pop has played.
    expect(screen.getByText('Next.js').closest('[cmdk-item]')!.querySelector('[data-slot="combobox-item-indicator"]')).not.toBeNull()
    expect((screen.getByPlaceholderText('Select framework...') as HTMLInputElement).value).toBe('Next.js')
    await act(async () => new Promise((r) => setTimeout(r, 400)))
    expect(document.querySelector('[data-slot="combobox-list"][data-state="open"]')).toBeNull()
  })

  it('typing opens the list and filters it; the input ring attaches', async () => {
    render(h(ComboboxApp))
    const input = screen.getByPlaceholderText('Select framework...')
    expect(input.closest('[data-slot="combobox-input-goo"]')!.hasAttribute('data-goop-active')).toBe(true)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'ast' } })
    })
    await flush()
    expect(document.querySelector('[data-slot="combobox-list"]')).not.toBeNull()
    expect(screen.queryByText('Nuxt')).toBeNull()
    expect(screen.getByText('Astro')).toBeTruthy()
  })

  it("goo={false} on the list is shadcn's popover list (flat highlight)", async () => {
    render(h(ComboboxApp, { list: { goo: false } }))
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Show frameworks'))
    })
    await flush()
    const list = document.querySelector('[data-slot="combobox-list"]')!
    expect(list.querySelector('[data-goop]')).toBeNull()
    expect(list.className).toContain('bg-popover')
    expect(list.querySelector('[cmdk-item]')!.className).toContain('data-[selected=true]:bg-accent')
  })

  it('is in the manifest with every part', () => {
    for (const n of [
      'GoopCombobox',
      'GoopComboboxAnchor',
      'GoopComboboxCancel',
      'GoopComboboxEmpty',
      'GoopComboboxGroup',
      'GoopComboboxInput',
      'GoopComboboxItem',
      'GoopComboboxItemIndicator',
      'GoopComboboxList',
      'GoopComboboxSeparator',
      'GoopComboboxTrigger',
    ])
      expect(goopComponents).toContain(n)
  })
})

// ---- NumberField --------------------------------------------------------------------------------

const numberView = (props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) =>
  h(
    GoopNumberField,
    { id: 'qty', min: 0, max: 5, defaultValue: 3, ...props },
    h(GoopNumberFieldContent, content, h(GoopNumberFieldDecrement), h(GoopNumberFieldInput), h(GoopNumberFieldIncrement)),
  )

describe('GoopNumberField', () => {
  it('steps with the buttons and keys, clamps to min / max, and nudges the goo', async () => {
    const onValueChange = vi.fn()
    const api = createRef<NumberFieldHandle>()
    render(numberView({ onValueChange, squish: false, speed: 2 }, { goopRef: api }))
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.id).toBe('qty')
    expect(input.value).toBe('3')
    expect(input.getAttribute('aria-valuemax')).toBe('5')
    const root = document.querySelector('[data-slot="number-field"]')!
    noEngineAttrs(root, /^(speed|squish)$/)
    const content = document.querySelector('[data-slot="number-field-content"]')!
    expect(content.getAttribute('data-goop-host')).toBe('number-field')
    expect(content.hasAttribute('data-goop-active')).toBe(true)
    expect(input.className).toContain('focus-visible:ring-0')
    const nudge = vi.spyOn(api.current!, 'nudge')
    const inc = screen.getByLabelText('Increase')
    await act(async () => {
      fireEvent.pointerDown(inc, { button: 0 })
      fireEvent.pointerUp(inc)
    })
    expect(input.value).toBe('4')
    expect(onValueChange).toHaveBeenLastCalledWith(4)
    expect(nudge).toHaveBeenLastCalledWith(1)
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
    })
    expect(input.value).toBe('5')
    expect((inc as HTMLButtonElement).disabled).toBe(true)
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Home' })
    })
    expect(input.value).toBe('0')
    expect(nudge).toHaveBeenLastCalledWith(-1)
    expect((screen.getByLabelText('Decrease') as HTMLButtonElement).disabled).toBe(true)
  })

  it('typed text commits on blur (parsed, clamped); formatOptions format the text', async () => {
    render(h('div', null, numberView(), h(GoopNumberField, { defaultValue: 24.5, step: 0.5, formatOptions: { style: 'currency', currency: 'USD' } }, h(GoopNumberFieldContent, null, h(GoopNumberFieldInput, { 'aria-label': 'Price' })))))
    const [qty, price] = screen.getAllByRole('spinbutton') as HTMLInputElement[]
    await act(async () => {
      fireEvent.change(qty!, { target: { value: '42' } })
      fireEvent.blur(qty!)
    })
    expect(qty!.value).toBe('5')
    expect(price!.value).toBe('$24.50')
    await act(async () => {
      fireEvent.keyDown(price!, { key: 'ArrowUp' })
    })
    expect(price!.value).toBe('$25.00')
  })

  it('goo={false} is a plain field (no host attrs, shadcn focus ring)', () => {
    render(numberView({ goo: false }))
    const content = document.querySelector('[data-slot="number-field-content"]')!
    expect(content.hasAttribute('data-goop-host')).toBe(false)
    expect(content.querySelector('[data-goop]')).toBeNull()
    expect(screen.getByRole('spinbutton').className).not.toContain('focus-visible:ring-0')
  })

  it('is in the manifest with every part', () => {
    for (const n of ['GoopNumberField', 'GoopNumberFieldContent', 'GoopNumberFieldDecrement', 'GoopNumberFieldIncrement', 'GoopNumberFieldInput']) expect(goopComponents).toContain(n)
  })
})

// ---- InputOTP -----------------------------------------------------------------------------------

const otpView = (props: Record<string, unknown> = {}) =>
  h(
    GoopInputOTP,
    { maxLength: 6, ...props },
    h(GoopInputOTPGroup, null, ...[0, 1, 2].map((i) => h(GoopInputOTPSlot, { key: i, index: i }))),
    h(GoopInputOTPSeparator),
    h(GoopInputOTPGroup, null, ...[3, 4, 5].map((i) => h(GoopInputOTPSlot, { key: i, index: i }))),
  )

describe('GoopInputOTP', () => {
  it("is shadcn's InputOTP on input-otp; the goo follows the active slot and pulses as characters land", async () => {
    const ref = createRef<HTMLInputElement>()
    const api = createRef<InputOTPHandle>()
    render(otpView({ ref, goopRef: api, flow: false, speed: 2 }))
    const input = ref.current!
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('data-slot')).toBe('input-otp')
    noEngineAttrs(input, /^(speed|flow)$/)
    const container = input.closest('[data-input-otp-container]')!
    expect(container.getAttribute('data-goop-host')).toBe('input-otp')
    expect(container.hasAttribute('data-goop-active')).toBe(true)
    expect(container.className).toContain('gap-2')
    expect(document.querySelectorAll('[data-slot="input-otp-slot"]').length).toBe(6)
    expect(document.querySelector('[data-slot="input-otp-separator"]')!.getAttribute('role')).toBe('separator')
    const h_ = api.current!
    expect(h_.active).toBe(-1)
    const setActive = vi.spyOn(h_, 'setActive')
    const pulse = vi.spyOn(h_, 'pulse')
    await act(async () => {
      input.focus()
      fireEvent.focus(input)
    })
    await act(async () => {
      fireEvent.change(input, { target: { value: '1' } })
    })
    await flush()
    expect(pulse).toHaveBeenCalledWith(0)
    expect(screen.getByText('1')).toBeTruthy()
    expect(setActive).toHaveBeenCalled()
    // The goo is the focus indicator: the active slot drops shadcn's ring.
    expect(document.querySelector('[data-slot="input-otp-slot"]')!.className).toContain('data-[active=true]:ring-0')
  })

  it('defaultValue fills the slots without a controlled / uncontrolled warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(otpView({ defaultValue: '42' }))
    const slots = document.querySelectorAll('[data-slot="input-otp-slot"]')
    expect(slots[0]!.textContent).toBe('4')
    expect(slots[1]!.textContent).toBe('2')
    expect(error.mock.calls.map((c) => String(c[0])).filter((m) => /value and defaultValue/.test(m))).toEqual([])
    error.mockRestore()
  })

  it('goo={false} is plain shadcn InputOTP', () => {
    const api = createRef<InputOTPHandle>()
    render(otpView({ goo: false, goopRef: api }))
    expect(api.current).toBeNull()
    const container = document.querySelector('[data-input-otp-container]')!
    expect(container.hasAttribute('data-goop-host')).toBe(false)
    expect(container.querySelector('[data-goop]')).toBeNull()
    expect(document.querySelector('[data-slot="input-otp-slot"]')!.className).not.toContain('ring-0')
  })

  it('app config reaches every bespoke component (reduced motion)', () => {
    const api = createRef<InputOTPHandle>()
    render(h(GoopProvider, { reducedMotion: true }, otpView({ goopRef: api })))
    expect(api.current!.reducedMotion).toBe(true)
  })

  it('is in the manifest with every part', () => {
    for (const n of ['GoopToaster', 'GoopInputOTP', 'GoopInputOTPGroup', 'GoopInputOTPSeparator', 'GoopInputOTPSlot']) expect(goopComponents).toContain(n)
  })
})

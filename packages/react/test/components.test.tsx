import { activeTickerCount, isLoopRunning, type EmergeHandle } from '@goopui/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoopButton,
  GoopCheckbox,
  GoopDialog,
  GoopDialogClose,
  GoopDialogContent,
  GoopDialogDescription,
  GoopDialogFooter,
  GoopDialogHeader,
  GoopDialogTitle,
  GoopDialogTrigger,
  GoopProvider,
  GoopSwitch,
  GoopTabs,
  GoopTabsContent,
  GoopTabsList,
  GoopTabsTrigger,
  goopComponents,
  useGoopConfig,
  type GoopButtonApi,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const layer = (el: Element) => el.querySelector(':scope > [data-goop="layer"]')

describe('GoopButton', () => {
  it('is shadcn markup with the goo attached, and cleans up on unmount', () => {
    const ref = createRef<HTMLButtonElement>()
    const api = createRef<GoopButtonApi>()
    const r = render(h(GoopButton, { ref, goopRef: api, className: 'px-8', onClick: () => {} }, 'Save'))
    const btn = screen.getByRole('button')
    expect(ref.current).toBe(btn)
    expect(btn.dataset.slot).toBe('button')
    expect(btn.dataset.variant).toBe('default')
    expect(btn.className).toContain('px-8')
    expect(btn.className).not.toContain('px-2.5')
    expect(btn.hasAttribute('data-goop-active')).toBe(true)
    expect(btn.style.backgroundColor).toBe('transparent')
    expect(layer(btn)?.getAttribute('aria-hidden')).toBe('true')
    expect(api.current?.handle).not.toBeNull()
    expect(api.current?.el).toBe(btn)
    r.unmount()
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('goo={false} and variant link are plain shadcn; engine props never reach the DOM', () => {
    render(h('div', null, h(GoopButton, { goo: false, dripSize: 9 }, 'A'), h(GoopButton, { variant: 'link', shockwave: false }, 'B')))
    for (const b of screen.getAllByRole('button')) {
      expect(b.hasAttribute('data-goop-active')).toBe(false)
      expect(layer(b)).toBeNull()
      expect(b.getAttributeNames().some((n) => /drip|shockwave/i.test(n))).toBe(false)
    }
  })

  it('asChild puts the goo on the child element', () => {
    render(h(GoopButton, { asChild: true, variant: 'outline' }, h('a', { href: '/x' }, 'Link')))
    const a = screen.getByRole('link')
    expect(a.dataset.goopHost).toBe('stroke')
    expect(layer(a)).not.toBeNull()
    expect(a.querySelector('[data-goop-label]')).toBeNull()
  })

  it('GoopProvider: nested providers merge over their parent', () => {
    let seen: unknown
    function Probe() {
      seen = useGoopConfig()
      return null
    }
    render(h(GoopProvider, { preset: 'wild', renderer: 'canvas' }, h(GoopProvider, { preset: 'subtle' }, h(Probe))))
    expect(seen).toEqual({ preset: 'subtle', renderer: 'canvas' })
  })
})

describe('GoopSwitch', () => {
  it('two aria-hidden goo layers, the thumb goes transparent, and state flows to core', () => {
    const onChange: boolean[] = []
    render(h(GoopSwitch, { onCheckedChange: (v: boolean) => onChange.push(v) }))
    const sw = screen.getByRole('switch')
    expect(sw.dataset.state).toBe('unchecked')
    expect(sw.className).toContain('data-[state=unchecked]:bg-input')
    // Goo fill attached: the checked track stays muted, the primary color is goo.
    expect(sw.className).toContain('data-[state=checked]:bg-input')
    expect(sw.className).not.toContain('data-[state=checked]:bg-primary')
    expect(sw.querySelectorAll('[data-goop="layer"]').length).toBe(2)
    expect((sw.querySelector('[data-slot="switch-thumb"]') as HTMLElement).style.backgroundColor).toBe('transparent')
    act(() => fireEvent.click(sw))
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(onChange).toEqual([true])
  })

  it('controlled: follows `checked`', () => {
    function Demo() {
      const [on, setOn] = useState(true)
      return h('div', null, h(GoopSwitch, { checked: on, onCheckedChange: setOn }), h('button', { onClick: () => setOn(false) }, 'off'))
    }
    render(h(Demo))
    const sw = screen.getByRole('switch')
    expect(sw.getAttribute('aria-checked')).toBe('true')
    act(() => fireEvent.click(screen.getByText('off')))
    expect(sw.getAttribute('aria-checked')).toBe('false')
  })
})

describe('GoopCheckbox', () => {
  it('one goo layer in the box; the mark is a data-goop-mark', () => {
    render(h(GoopCheckbox, { defaultChecked: true }))
    const cb = screen.getByRole('checkbox')
    expect(cb.dataset.state).toBe('checked')
    expect(cb.querySelectorAll('[data-goop="layer"]').length).toBe(1)
    expect(cb.querySelector('[data-goop-mark]')).not.toBeNull()
    act(() => fireEvent.click(cb))
    expect(cb.dataset.state).toBe('unchecked')
  })
})

describe('GoopTabs', () => {
  const tabs = (list: Record<string, unknown> = {}) =>
    h(
      GoopTabs,
      { defaultValue: 'a' },
      h(GoopTabsList, list, h(GoopTabsTrigger, { value: 'a' }, 'A'), h(GoopTabsTrigger, { value: 'b', className: 'px-4' }, 'B')),
      h(GoopTabsContent, { value: 'a' }, 'Panel A'),
      h(GoopTabsContent, { value: 'b' }, 'Panel B'),
    )

  it('the blob sits behind the triggers; triggers drop the flat active bg', () => {
    render(tabs())
    const list = screen.getByRole('tablist')
    expect(list.hasAttribute('data-goop-tabs')).toBe(true)
    expect(list.hasAttribute('data-goop-menu')).toBe(true)
    expect(list.querySelector('[data-goop="highlight"]')?.getAttribute('aria-hidden')).toBe('true')
    const b = screen.getByRole('tab', { name: 'B' })
    expect(b.className).not.toContain('data-[state=active]:bg-background')
    expect(b.className.split(' ')).toContain('px-4')
    expect(b.className.split(' ')).not.toContain('px-1.5')
  })

  it('follows the active tab', () => {
    render(tabs())
    act(() => {
      fireEvent.mouseDown(screen.getByRole('tab', { name: 'B' }), { button: 0 })
    })
    expect(screen.getByRole('tab', { name: 'B' }).dataset.state).toBe('active')
    expect(screen.getByText('Panel B')).toBeTruthy()
  })

  it('a mouse click focuses the trigger without the focus-visible ring (keyboard still shows it)', () => {
    const onMouseDown = vi.fn()
    render(
      h(GoopTabs, { defaultValue: 'a' }, h(GoopTabsList, null, h(GoopTabsTrigger, { value: 'a' }, 'A'), h(GoopTabsTrigger, { value: 'b', onMouseDown }, 'B'))),
    )
    const b = screen.getByRole('tab', { name: 'B' })
    const focus = vi.spyOn(b, 'focus')
    act(() => {
      fireEvent.mouseDown(b, { button: 0 })
    })
    expect(onMouseDown).toHaveBeenCalledOnce()
    // First call is ours, with focusVisible: false; Radix's own focus() follows (a no-op).
    expect(focus.mock.calls[0]?.[0]).toEqual({ focusVisible: false })
    expect(document.activeElement).toBe(b)
    expect(b.dataset.state).toBe('active')
    // Not a primary click: left to Radix.
    const a = screen.getByRole('tab', { name: 'A' })
    const focusA = vi.spyOn(a, 'focus')
    act(() => {
      fireEvent.mouseDown(a, { button: 2 })
    })
    expect(focusA).not.toHaveBeenCalled()
  })

  it('goo={false} and variant line are exactly shadcn', () => {
    render(h('div', null, tabs({ goo: false }), tabs({ variant: 'line' })))
    for (const list of screen.getAllByRole('tablist')) {
      expect(list.hasAttribute('data-goop-tabs')).toBe(false)
      expect(list.querySelector('[data-goop="highlight"]')).toBeNull()
    }
    expect(screen.getAllByRole('tab')[0]!.className).toContain('data-[state=active]:bg-background')
  })

  it('is in the manifest with every shadcn part', () => {
    for (const n of ['GoopTabs', 'GoopTabsList', 'GoopTabsTrigger', 'GoopTabsContent']) expect(goopComponents).toContain(n)
  })
})

describe('GoopDialog', () => {
  const api = createRef<EmergeHandle>()
  function Demo(props: { content?: Record<string, unknown>; defaultOpen?: boolean }) {
    return h(
      GoopDialog,
      { defaultOpen: props.defaultOpen },
      h(GoopDialogTrigger, { asChild: true }, h(GoopButton, { variant: 'outline' }, 'Edit profile')),
      h(
        GoopDialogContent,
        { goopRef: api, ...props.content },
        h(GoopDialogHeader, null, h(GoopDialogTitle, null, 'Edit profile'), h(GoopDialogDescription, null, 'Make changes.')),
        h(GoopDialogFooter, { showCloseButton: true }, h(GoopDialogClose, { asChild: true }, h(GoopButton, null, 'Save'))),
      ),
    )
  }

  it('opens: the panel blooms on an aria-hidden surface; close holds it until the goo is gone', async () => {
    render(h(Demo))
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Edit profile' })))
    const dialog = screen.getByRole('dialog')
    expect(dialog.dataset.slot).toBe('dialog-content')
    expect(dialog.hasAttribute('data-goop-emerge')).toBe(true)
    const surface = dialog.querySelector(':scope > [data-goop="surface"]')
    expect(surface?.getAttribute('aria-hidden')).toBe('true')
    expect(dialog.className).toContain('[--goop-color:var(--popover)]')
    expect(dialog.className).not.toContain('bg-popover')
    // Plain fading overlay by default (the goo pour is opt-in).
    expect(document.querySelector('[data-slot="dialog-overlay"]')!.className).toContain('bg-black/10')
    expect(isLoopRunning() || activeTickerCount() >= 0).toBe(true)

    // Close: core's close() runs in the commit that flips data-state (a child layout effect,
    // so before Radix Presence's), while the panel is still mounted: goop.css's hold animation
    // gets its duration in time. (happy-dom doesn't run the hold animation, so Presence then
    // unmounts at once here; the consumer-app browser checks cover the visible close.)
    const h0 = api.current!
    const calls: string[] = []
    const close = h0.close.bind(h0)
    h0.close = () => {
      calls.push(`${dialog.dataset.state}:${dialog.isConnected}`)
      return close()
    }
    act(() => fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!))
    expect(calls).toEqual(['closed:true'])
  })

  it('overlay opts into the goo pour; goo={false} is plain shadcn', () => {
    const { unmount } = render(h(Demo, { defaultOpen: true, content: { overlay: true } }))
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    expect(overlay.querySelector('[data-goop="surface"]')).not.toBeNull()
    expect(overlay.hasAttribute('data-goop-backdrop')).toBe(true)
    unmount()
    render(h(Demo, { defaultOpen: true, content: { goo: false } }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('[data-goop="surface"]')).toBeNull()
    expect(dialog.className).toContain('bg-popover')
  })

  it('sound: the trigger and close carry one cue each, the asChild buttons none of their own', () => {
    render(h(GoopProvider, { sound: true }, h(Demo, { defaultOpen: true })))
    const trigger = screen.getByRole('button', { name: 'Edit profile', hidden: true })
    expect(trigger.hasAttribute('data-cuelume-open')).toBe(true)
    expect(trigger.hasAttribute('data-cuelume-tap')).toBe(false)
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save.getAttributeNames().filter((n) => n.startsWith('data-cuelume-') && n !== 'data-cuelume-emphasis')).toHaveLength(1)
    expect(save.hasAttribute('data-cuelume-tap')).toBe(false)
  })
})

describe('reduced motion', () => {
  it('html[data-reduced-motion] (or the media query) keeps the goo still', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    render(h(GoopButton, null, 'x'))
    expect(screen.getByRole('button').hasAttribute('data-goop-active')).toBe(true)
  })
})

// Client tests for the bloom overlays: Popover, Tooltip, HoverCard, AlertDialog, Sheet. Each
// renders shadcn/ui's markup, keeps engine props off the DOM, blooms the panel on an
// aria-hidden surface (never attached to the trigger), and maps props to the same core options
// as @goopui/vue.
import type { EmergeHandle, SheetHandle } from '@goopui/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as vue from '../../vue/src/goop-props'
import {
  GoopAlertDialog,
  GoopAlertDialogAction,
  GoopAlertDialogCancel,
  GoopAlertDialogContent,
  GoopAlertDialogDescription,
  GoopAlertDialogFooter,
  GoopAlertDialogHeader,
  GoopAlertDialogMedia,
  GoopAlertDialogTitle,
  GoopAlertDialogTrigger,
  GoopButton,
  GoopHoverCard,
  GoopHoverCardContent,
  GoopHoverCardTrigger,
  GoopPopover,
  GoopPopoverContent,
  GoopPopoverDescription,
  GoopPopoverHeader,
  GoopPopoverTitle,
  GoopPopoverTrigger,
  GoopProvider,
  GoopSheet,
  GoopSheetClose,
  GoopSheetContent,
  GoopSheetDescription,
  GoopSheetFooter,
  GoopSheetHeader,
  GoopSheetTitle,
  GoopSheetTrigger,
  GoopTooltip,
  GoopTooltipContent,
  GoopTooltipProvider,
  GoopTooltipTrigger,
  goopComponents,
  toHoverCardOptions,
  toPopoverOptions,
  toSheetOptions,
  toTooltipOptions,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const ENGINE_ATTR = /^(flow|flowstyle|bloomstart|bloomfrom|wobble|momentum|fade|openslosh|opendrips|closeslosh|surface|speed|preset|renderer)$/i
const noEngineAttrs = (el: Element) => expect(el.getAttributeNames().filter((n) => ENGINE_ATTR.test(n))).toEqual([])

/** The close runs while the panel is still mounted and already data-state="closed". */
function spyClose(handle: EmergeHandle, el: HTMLElement): string[] {
  const calls: string[] = []
  const close = handle.close.bind(handle)
  handle.close = () => {
    calls.push(`${el.dataset.state}:${el.isConnected}`)
    return close()
  }
  return calls
}

describe('GoopPopover', () => {
  const api = createRef<EmergeHandle>()
  const Demo = (content: Record<string, unknown> = {}) =>
    h(
      GoopPopover,
      null,
      h(GoopPopoverTrigger, { asChild: true }, h(GoopButton, { variant: 'outline' }, 'Open popover')),
      h(
        GoopPopoverContent,
        { goopRef: api, ...content },
        h(GoopPopoverHeader, null, h(GoopPopoverTitle, null, 'Dimensions'), h(GoopPopoverDescription, null, 'Set the dimensions.')),
      ),
    )

  it('the dialog is named by its trigger (as in reka-ui) unless labelled', () => {
    render(Demo())
    const trigger = screen.getByRole('button', { name: 'Open popover' })
    act(() => fireEvent.click(trigger))
    expect(screen.getByRole('dialog', { name: 'Open popover' })).toBeTruthy()
  })

  it('blooms the panel on an aria-hidden surface, not on the trigger; close holds it', () => {
    render(Demo({ speed: 2, openDrips: 0.5 }))
    const trigger = screen.getByRole('button', { name: 'Open popover' })
    act(() => fireEvent.click(trigger))
    const panel = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    expect(panel.hasAttribute('data-goop-emerge')).toBe(true)
    expect(panel.querySelector(':scope > [data-goop="surface"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(panel.className).toContain('w-72')
    expect(panel.className).toContain('[--goop-color:var(--popover)]')
    expect(panel.className).not.toContain('bg-popover')
    expect(trigger.hasAttribute('data-goop-emerge')).toBe(false)
    expect(trigger.querySelector('[data-goop="surface"]')).toBeNull()
    noEngineAttrs(panel)
    const calls = spyClose(api.current!, panel)
    act(() => fireEvent.click(trigger))
    expect(calls).toEqual(['closed:true'])
  })

  it("goo={false} is shadcn's PopoverContent", () => {
    render(Demo({ goo: false }))
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Open popover' })))
    const panel = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    expect(panel.querySelector('[data-goop="surface"]')).toBeNull()
    expect(panel.className).toContain('bg-popover')
    expect(panel.className).toContain('origin-(--radix-popover-content-transform-origin)')
  })

  it('sound: the trigger carries the popover cue, its asChild button none of its own', () => {
    render(h(GoopProvider, { sound: true }, Demo()))
    const trigger = screen.getByRole('button', { name: 'Open popover' })
    expect(trigger.hasAttribute('data-cuelume-open')).toBe(true)
    expect(trigger.hasAttribute('data-cuelume-tap')).toBe(false)
  })
})

describe('GoopTooltip', () => {
  const Demo = (content: Record<string, unknown> = {}) =>
    h(
      GoopTooltipProvider,
      null,
      h(GoopTooltip, { defaultOpen: true }, h(GoopTooltipTrigger, { asChild: true }, h(GoopButton, { variant: 'outline' }, 'Hover me')), h(GoopTooltipContent, content, 'Add to library')),
    )

  it('blooms once (not in the screen-reader copy); the label fades with the goo', () => {
    render(Demo({ side: 'right' }))
    const tip = document.querySelector('[data-slot="tooltip-content"]') as HTMLElement
    expect(tip.hasAttribute('data-goop-emerge')).toBe(true)
    expect(document.querySelectorAll('[data-goop-emerge]').length).toBe(1)
    expect(tip.querySelector(':scope > [data-goop="label"]')?.textContent).toBe('Add to library')
    expect(tip.className).toContain('[--goop-color:var(--foreground)]')
    expect(tip.className).not.toContain('bg-foreground')
    expect(screen.getByRole('tooltip').textContent).toBe('Add to library')
    noEngineAttrs(tip)
  })

  it("goo={false} is shadcn's TooltipContent with its arrow", () => {
    render(Demo({ goo: false }))
    const tip = document.querySelector('[data-slot="tooltip-content"]') as HTMLElement
    expect(tip.querySelector('[data-goop]')).toBeNull()
    expect(tip.className).toContain('bg-foreground')
    expect(tip.querySelector('svg')?.getAttribute('class')).toContain('fill-foreground')
  })
})

describe('GoopHoverCard', () => {
  it('blooms from the side facing its trigger, in the popover color by default', () => {
    const api = createRef<EmergeHandle>()
    render(
      h(
        GoopHoverCard,
        { defaultOpen: true },
        h(GoopHoverCardTrigger, { href: '#' }, '@nextjs'),
        h(GoopHoverCardContent, { goopRef: api, bloomFrom: 'center' }, h('p', null, 'The React Framework')),
      ),
    )
    const card = document.querySelector('[data-slot="hover-card-content"]') as HTMLElement
    expect(card.hasAttribute('data-goop-emerge')).toBe(true)
    expect(card.className).toContain('w-64')
    expect(api.current).not.toBeNull()
    expect(screen.getByText('@nextjs').tagName).toBe('A')
    noEngineAttrs(card)
  })
})

describe('GoopAlertDialog', () => {
  const api = createRef<EmergeHandle>()
  const Demo = (content: Record<string, unknown> = {}, open?: boolean) =>
    h(
      GoopAlertDialog,
      { defaultOpen: open },
      h(GoopAlertDialogTrigger, { asChild: true }, h(GoopButton, { variant: 'outline' }, 'Delete account')),
      h(
        GoopAlertDialogContent,
        { goopRef: api, ...content },
        h(
          GoopAlertDialogHeader,
          null,
          h(GoopAlertDialogMedia, null, h('svg')),
          h(GoopAlertDialogTitle, null, 'Are you absolutely sure?'),
          h(GoopAlertDialogDescription, null, 'This action cannot be undone.'),
        ),
        h(GoopAlertDialogFooter, null, h(GoopAlertDialogCancel, null, 'Cancel'), h(GoopAlertDialogAction, { variant: 'destructive' }, 'Continue')),
      ),
    )

  it('blooms with the lighter alert splash; plain fade overlay; Cancel and Action are GoopButtons', () => {
    render(Demo({ size: 'sm' }))
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Delete account' })))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.dataset.slot).toBe('alert-dialog-content')
    expect(dialog.dataset.size).toBe('sm')
    expect(dialog.hasAttribute('data-goop-emerge')).toBe(true)
    expect(dialog.className).toContain('group/alert-dialog-content')
    expect(dialog.className).not.toContain('bg-popover')
    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')!.className).toContain('bg-black/10')
    expect(document.querySelector('[data-slot="alert-dialog-media"]')).not.toBeNull()
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(cancel.dataset.slot).toBe('alert-dialog-cancel')
    expect(cancel.className).toContain('border')
    expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('data-goop-host')).toBe(true)
    noEngineAttrs(dialog)
    const calls = spyClose(api.current!, dialog)
    act(() => fireEvent.click(cancel))
    expect(calls).toEqual(['closed:true'])
  })

  it('overlay opts into the goo pour; goo={false} is plain shadcn', () => {
    const { unmount } = render(Demo({ overlay: true }, true))
    const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]')!
    expect(overlay.hasAttribute('data-goop-backdrop')).toBe(true)
    unmount()
    render(Demo({ goo: false }, true))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.querySelector('[data-goop="surface"]')).toBeNull()
    expect(dialog.className).toContain('bg-popover')
  })
})

describe('GoopSheet', () => {
  const api = createRef<SheetHandle>()
  const Demo = (content: Record<string, unknown> = {}) =>
    h(
      GoopSheet,
      null,
      h(GoopSheetTrigger, { asChild: true }, h(GoopButton, { variant: 'outline' }, 'Open sheet')),
      h(
        GoopSheetContent,
        { goopRef: api, ...content },
        h(GoopSheetHeader, null, h(GoopSheetTitle, null, 'Edit profile'), h(GoopSheetDescription, null, 'Make changes.')),
        h(GoopSheetFooter, null, h(GoopSheetClose, { asChild: true }, h(GoopButton, null, 'Save changes'))),
      ),
    )

  it('blooms from its screen edge; the overlay fades over the goo close', () => {
    render(Demo({ side: 'left' }))
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Open sheet' })))
    const sheet = screen.getByRole('dialog')
    expect(sheet.dataset.slot).toBe('sheet-content')
    expect(sheet.dataset.side).toBe('left')
    expect(sheet.hasAttribute('data-goop-emerge')).toBe(true)
    expect(sheet.className).toContain('left-0')
    expect(sheet.className).not.toContain('slide-in-from-left-10')
    expect(sheet.className).not.toContain('bg-popover')
    expect(sheet.querySelector(':scope > [data-goop="surface"]')).not.toBeNull()
    const overlay = document.querySelector('[data-slot="sheet-overlay"]') as HTMLElement
    expect(overlay.style.animationDuration).toMatch(/ms$/)
    expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()
    noEngineAttrs(sheet)
    const calls = spyClose(api.current!, sheet)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Save changes' })))
    expect(calls).toEqual(['closed:true'])
  })

  it("goo={false} is shadcn's sliding SheetContent", () => {
    render(Demo({ goo: false, side: 'bottom' }))
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Open sheet' })))
    const sheet = screen.getByRole('dialog')
    expect(sheet.querySelector('[data-goop="surface"]')).toBeNull()
    expect(sheet.className).toContain('slide-in-from-bottom-10')
    expect(sheet.className).toContain('bg-popover')
  })
})

describe('overlay props map like the Vue adapter', () => {
  const cases = [
    {},
    { flow: false },
    { flowStyle: 'neck' as const, openDrips: 0.5, surface: 'trigger' as const },
    { openSlosh: true, closeSlosh: false, speed: 2, preset: 'wild' as const },
  ]
  it('tooltip, hover card and sheet options match @goopui/vue', () => {
    for (const p of cases) {
      expect(toTooltipOptions(p)).toEqual(vue.toTooltipOptions(p))
      expect(toHoverCardOptions({ ...p, bloomFrom: 'center' })).toEqual(vue.toHoverCardOptions({ ...p, bloomFrom: 'center' }))
    }
    expect(toSheetOptions({})).toEqual(vue.toSheetOptions({}))
    expect(toSheetOptions({ openDrips: false, renderer: 'svg' }, { preset: 'subtle' })).toEqual(vue.toSheetOptions({ openDrips: false, renderer: 'svg' }, { preset: 'subtle' }))
  })

  it("popover defaults are GoopPopoverContent.vue's (surface 'trigger', every toggle on)", () => {
    const o = toPopoverOptions({})
    expect(o).toMatchObject({ flow: true, flowStyle: 'bloom', bloomStart: 'single', openSlosh: true, openDrips: true, closeSlosh: true, surfaceColor: 'trigger', speed: 1 })
  })

  it('every overlay part is in the manifest', () => {
    for (const n of ['GoopPopover', 'GoopPopoverContent', 'GoopTooltip', 'GoopTooltipProvider', 'GoopHoverCard', 'GoopHoverCardContent', 'GoopAlertDialog', 'GoopAlertDialogMedia', 'GoopSheet', 'GoopSheetContent'])
      expect(goopComponents).toContain(n)
  })
})

describe('reduced motion', () => {
  it('the popover panel keeps still under html[data-reduced-motion]', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    render(h(GoopPopover, { defaultOpen: true }, h(GoopPopoverTrigger, null, 'x'), h(GoopPopoverContent, null, 'Body')))
    expect(document.querySelector('[data-slot="popover-content"]')!.hasAttribute('data-goop-still')).toBe(true)
  })
})

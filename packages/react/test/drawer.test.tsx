// Client tests for GoopDrawer: shadcn/ui's Drawer markup with vaul's root API, driven by the
// same core engine as @goopui/vue's GoopDrawer (createDrawer on Radix Dialog, no vaul).
import { DRAWER_EFFECTS, DRAWER_GOO_ATTR, type DrawerController } from '@goopui/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DRAWER_PROP_KEYS,
  GoopDrawer,
  GoopDrawerClose,
  GoopDrawerContent,
  GoopDrawerDescription,
  GoopDrawerFooter,
  GoopDrawerHeader,
  GoopDrawerTitle,
  GoopDrawerTrigger,
  GoopProvider,
  goopComponents,
  toDrawerOptions,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const content = () => document.querySelector<HTMLElement>('[data-slot="drawer-content"]')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const until = async (fn: () => boolean, ms = 4000) => {
  const t0 = Date.now()
  while (!fn() && Date.now() - t0 < ms) await act(() => wait(20))
  return fn()
}
const escape = () => fireEvent.keyDown(content()!, { key: 'Escape' })

interface DemoProps {
  open?: boolean
  root?: Record<string, unknown>
  content?: Record<string, unknown>
  onOpenChange?: (v: boolean) => void
  onClose?: () => void
  onAnimationEnd?: (v: boolean) => void
}
function Demo(p: DemoProps) {
  const [open, setOpen] = useState(p.open ?? true)
  return h(
    GoopDrawer,
    {
      ...p.root,
      open,
      onOpenChange: (v: boolean) => {
        setOpen(v)
        p.onOpenChange?.(v)
      },
      onClose: p.onClose,
      onAnimationEnd: p.onAnimationEnd,
    },
    h(GoopDrawerTrigger, null, 'Open'),
    h(
      GoopDrawerContent,
      { renderer: 'svg', ...p.content },
      h(GoopDrawerHeader, null, h(GoopDrawerTitle, null, 'Move goal'), h(GoopDrawerDescription, null, 'Set your daily activity goal.')),
      h(GoopDrawerFooter, null, h(GoopDrawerClose, null, 'Cancel')),
    ),
  )
}

describe('GoopDrawer', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const name of [
      'GoopDrawer',
      'GoopDrawerTrigger',
      'GoopDrawerPortal',
      'GoopDrawerContent',
      'GoopDrawerHeader',
      'GoopDrawerFooter',
      'GoopDrawerTitle',
      'GoopDrawerDescription',
      'GoopDrawerClose',
      'GoopDrawerOverlay',
    ])
      expect(goopComponents).toContain(name)
  })

  it('every core drawer effect is a prop (same options as Vue)', () => {
    for (const k of DRAWER_EFFECTS) expect(DRAWER_PROP_KEYS).toContain(k)
    const o = toDrawerOptions({ lag: false, splash: 0.5, speed: 2, goo: false }, { preset: 'wild' })
    expect(o).toMatchObject({ lag: false, splash: 0.5, speed: 2, goo: false, preset: 'wild', renderer: 'canvas' })
    expect('slosh' in o).toBe(false)
  })

  it('a11y: a labelled modal dialog with vaul data attributes; the goo surface and handle are aria-hidden', async () => {
    const api = createRef<DrawerController>()
    render(h(Demo, { content: { goopRef: api, lag: 0.5 } }))
    const el = content()!
    expect(el).not.toBeNull()
    expect(el.getAttribute('role')).toBe('dialog')
    expect(el.getAttribute('data-state')).toBe('open')
    expect(el.getAttribute('data-vaul-drawer-direction')).toBe('bottom')
    const title = document.querySelector('[data-slot="drawer-title"]')!
    const desc = document.querySelector('[data-slot="drawer-description"]')!
    expect(el.getAttribute('aria-labelledby')).toBe(title.id)
    expect(el.getAttribute('aria-describedby')).toBe(desc.id)
    expect(el.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
    expect(el.querySelector('[data-goop="surface"]')!.getAttribute('aria-hidden')).toBe('true')
    expect(el.className).toContain('[--goop-color:var(--popover)]')
    expect(el.className).not.toContain('bg-popover')
    // Engine props stay off the DOM.
    expect(el.hasAttribute('lag')).toBe(false)
    const grip = el.querySelector<HTMLElement>('[data-goop-drawer-handle]')!
    expect(grip.getAttribute('aria-hidden')).toBe('true')
    expect(grip.className).toContain('[--goop-color:var(--muted)]')
    // Visible on dark: the muted text mixed into the panel, not bg-muted.
    expect(grip.className).toContain('dark:[--goop-color:color-mix(in_oklab,var(--muted-foreground)_50%,var(--popover))]')
    expect(grip.querySelector('[data-goop="layer"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeNull()
    expect(api.current).not.toBeNull()
    expect(api.current!.state === 'opening' || api.current!.state === 'open').toBe(true)
  })

  it('Escape closes through the engine: stays mounted while it animates out, then unmounts', async () => {
    const onOpenChange = vi.fn()
    const onClose = vi.fn()
    const onAnimationEnd = vi.fn()
    render(h(Demo, { onOpenChange, onClose, onAnimationEnd }))
    expect(await until(() => onAnimationEnd.mock.calls.some((c) => c[0] === true))).toBe(true)
    act(() => escape())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(content()?.getAttribute('data-state')).toBe('closed')
    expect(await until(() => content() === null)).toBe(true)
    expect(onAnimationEnd).toHaveBeenLastCalledWith(false)
    expect(document.querySelector('[data-slot="drawer-overlay"]')).toBeNull()
  })

  it('opening from the trigger mounts the panel and attaches the engine', async () => {
    const onOpenChange = vi.fn()
    render(h(Demo, { open: false, onOpenChange }))
    expect(content()).toBeNull()
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Open' })))
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(content()).not.toBeNull()
    expect(content()!.hasAttribute(DRAWER_GOO_ATTR)).toBe(true)
  })

  it('dismissible: false ignores Escape, but the Close button still closes', () => {
    const onOpenChange = vi.fn()
    render(h(Demo, { root: { dismissible: false }, onOpenChange }))
    act(() => escape())
    expect(onOpenChange).not.toHaveBeenCalled()
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Cancel' })))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('snap points: rests on the active point, follows activeSnapPoint, resets to the first on close', async () => {
    let setSnap!: (v: number | string | null) => void
    let setOpen!: (v: boolean) => void
    let snapNow: number | string | null = 0.5
    function W() {
      const [snap, set] = useState<number | string | null>(0.5)
      const [open, so] = useState(true)
      setSnap = set
      setOpen = so
      snapNow = snap
      return h(
        GoopDrawer,
        { open, onOpenChange: so, snapPoints: [0.25, 0.5, 1], activeSnapPoint: snap, setActiveSnapPoint: set },
        h(GoopDrawerContent, { renderer: 'svg' }, h(GoopDrawerTitle, null, 'Snap')),
      )
    }
    render(h(W))
    const el = content()!
    expect(el.getAttribute('data-vaul-snap-points')).toBe('true')
    Object.defineProperty(el, 'offsetHeight', { value: window.innerHeight, configurable: true })
    const ty = () => Number(/translate3d\([^,]+, ([-\d.]+)px/.exec(el.style.transform)?.[1] ?? Number.NaN)
    expect(await until(() => Math.abs(ty() - window.innerHeight * 0.5) < 1)).toBe(true)
    act(() => setSnap(1))
    expect(await until(() => Math.abs(ty()) < 1)).toBe(true)
    act(() => setOpen(false))
    expect(await until(() => content() === null)).toBe(true)
    expect(snapNow).toBe(0.25)
  })

  it('direction is passed to the panel (shadcn direction classes key off it)', () => {
    render(h(Demo, { root: { direction: 'left' } }))
    const el = content()!
    expect(el.getAttribute('data-vaul-drawer-direction')).toBe('left')
    expect(el.className).toContain('data-[vaul-drawer-direction=left]:left-0')
  })

  it('shouldScaleBackground scales [data-vaul-drawer-wrapper] while open', async () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-vaul-drawer-wrapper', '')
    document.body.append(wrapper)
    render(h(Demo))
    expect(await until(() => wrapper.style.transform.includes('scale'))).toBe(true)
  })

  it("goo={false} is plain shadcn: background, border, solid handle, no goo surface; handle={false} keeps the goo panel", () => {
    const { unmount } = render(h(Demo, { content: { goo: false } }))
    let el = content()!
    expect(el.querySelector('[data-goop="surface"]')).toBeNull()
    expect(el.className).toContain('bg-popover')
    expect(el.className).toContain('data-[vaul-drawer-direction=bottom]:border-t')
    expect(el.querySelector('[data-goop-drawer-handle]')!.className).toContain('bg-muted')
    unmount()
    render(h(Demo, { content: { handle: false } }))
    el = content()!
    expect(el.querySelector('[data-goop="surface"]')).not.toBeNull()
    const grip = el.querySelector<HTMLElement>('[data-goop-drawer-handle]')!
    expect(grip.className).toContain('bg-muted')
    expect(grip.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('reduced motion (app config): the engine runs still, no goo sim', () => {
    const api = createRef<DrawerController>()
    render(h(GoopProvider, { reducedMotion: true }, h(Demo, { content: { goopRef: api } })))
    expect(api.current!.reducedMotion).toBe(true)
  })

  it('sound: the trigger and close carry their drawer cues', () => {
    render(h(GoopProvider, { sound: true }, h(Demo)))
    const trigger = screen.getByRole('button', { name: 'Open', hidden: true })
    expect(trigger.hasAttribute('data-cuelume-open')).toBe(true)
    const close = screen.getByRole('button', { name: 'Cancel' })
    expect(close.hasAttribute('data-cuelume-close')).toBe(true)
  })
})

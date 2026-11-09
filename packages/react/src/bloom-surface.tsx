'use client'
// The aria-hidden goo surface of a bloom overlay (GoopPopoverContent, GoopTooltipContent,
// GoopHoverCardContent, GoopAlertDialogContent, GoopSheetContent): the same mechanics as
// GoopDialog's own surface. It attaches core's engine to its parent (the Radix Content, which
// Presence remounts on every open) when it mounts, and plays open / close as `open` flips.
// Layout effects run child-first, so close() (which sets the hold animation's duration via
// --goop-emerge-close) lands before Radix Presence reads the exit animation.
import { useRef, useState, type CSSProperties, type Ref } from 'react'
import { setRef, useIsomorphicLayoutEffect } from './utils'

export interface Attachable<O> {
  open(): void
  close(): number
  update(o: O): void
  destroy(): void
}

const SURFACE_STYLE: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', borderRadius: 'inherit' }
/** A sheet's goo is square against the screen edge. */
export const SQUARE_SURFACE_STYLE: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }

export function BloomSurface<O, H extends Attachable<O>>({
  options,
  open,
  create,
  handleRef,
  hostSlot,
  onAttach,
  style = SURFACE_STYLE,
}: {
  options: O
  open: boolean
  /** Builds the handle. Read once, when the surface mounts. */
  create: (host: HTMLElement, el: HTMLElement, o: O) => H
  /** Gets the live handle when the surface attaches, null when it goes. */
  handleRef?: Ref<H>
  /** Only attach when the parent has this `data-slot` (Radix Tooltip renders its children
   *  twice: the second copy sits in a visually hidden span for screen readers). */
  hostSlot?: string
  /** Called with the handle after it attaches and after every options update. */
  onAttach?: (h: H) => void
  style?: CSSProperties
}) {
  const el = useRef<HTMLSpanElement | null>(null)
  const handle = useRef<H | null>(null)
  const shown = useRef(open)
  const latest = useRef(options)
  latest.current = options
  const openNow = useRef(open)
  openNow.current = open
  const notify = useRef(onAttach)
  notify.current = onAttach

  useIsomorphicLayoutEffect(() => {
    const span = el.current
    const host = span?.parentElement
    if (!span || !host) return
    if (hostSlot && host.getAttribute('data-slot') !== hostSlot) return
    const h = create(host, span, latest.current)
    handle.current = h
    setRef(handleRef, h)
    shown.current = openNow.current
    if (openNow.current) h.open()
    notify.current?.(h)
    return () => {
      h.destroy()
      handle.current = null
      setRef(handleRef, null)
    }
    // `create` is stable per surface kind.
  }, [])

  useIsomorphicLayoutEffect(() => {
    const h = handle.current
    if (!h) return
    h.update(options)
    notify.current?.(h)
  }, [options])

  useIsomorphicLayoutEffect(() => {
    const h = handle.current
    if (!h || shown.current === open) return
    shown.current = open
    if (open) h.open()
    else h.close()
  }, [open])

  return <span ref={el} data-goop="surface" aria-hidden="true" style={style} />
}

/** Radix parks the floating wrapper at translate(0, -200%) until floating-ui has placed it. */
export const positioned = (host: HTMLElement): boolean => {
  const wrap = host.parentElement
  return !wrap?.hasAttribute('data-radix-popper-content-wrapper') || !wrap.style.transform.includes('-200%')
}

/** Tracks a Radix root's `open` (controlled or not), so the goo can play open / close. */
export function useOpenState(
  openProp: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
): [boolean, (open: boolean) => void] {
  const [inner, setInner] = useState(!!defaultOpen)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : inner
  const latest = useRef(onOpenChange)
  latest.current = onOpenChange
  const ctl = useRef(controlled)
  ctl.current = controlled
  const change = useRef((v: boolean) => {
    if (!ctl.current) setInner(v)
    latest.current?.(v)
  }).current
  return [open, change]
}

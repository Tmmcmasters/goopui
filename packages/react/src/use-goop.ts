'use client'
import { attachGoop, type GoopHandle, type GoopOptions } from '@goopui/core'
import { useRef, useState, type RefObject } from 'react'
import { diffOptions, sameValue } from './goop-props'
import { useIsomorphicLayoutEffect } from './utils'

export interface UseGoopReturn {
  /** The live engine handle; null on the server, before mount, after unmount, or when off. */
  handle: GoopHandle | null
  /** True while the goo is attached. Always false during SSR and hydration, so markup that
   *  depends on it can't mismatch. */
  active: boolean
}

/**
 * Attach the goo engine to an element for the lifetime of the calling component (mirrors
 * @goopui/vue's useGoop).
 *
 * SSR-safe by construction: nothing touches `document` until the layout effect, which runs
 * after hydration, and core builds the aria-hidden goo layer itself on the client, so server
 * markup never contains it. Option changes go through `handle.update()` (renderer/finish
 * hot-swap in core, so no remount). `enabled` going false destroys the goo; true attaches it
 * again.
 */
export function useGoop(target: RefObject<Element | null>, options: GoopOptions, enabled = true): UseGoopReturn {
  const [handle, setHandle] = useState<GoopHandle | null>(null)
  const sent = useRef<GoopOptions>({})
  const latest = useRef(options)
  latest.current = options

  useIsomorphicLayoutEffect(() => {
    if (!enabled) return
    const el = target.current
    if (!el || el.nodeType !== 1) return
    sent.current = latest.current
    const h = attachGoop(el as HTMLElement, sent.current)
    setHandle(h)
    return () => {
      h.destroy()
      setHandle(null)
    }
  }, [enabled, target])

  // After every render (the DOM, classes and --goop-* vars are already patched): send what
  // changed. diffOptions is a deep compare, so a fresh-but-equal options object is a no-op.
  useIsomorphicLayoutEffect(() => {
    if (!handle) return
    const patch = diffOptions(sent.current, options)
    sent.current = options
    if (patch) handle.update(patch)
  })

  return { handle, active: handle !== null }
}

/** FNV-1a hash of a string (e.g. `useId()`) into a 32-bit engine seed. */
export function seedFrom(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

interface Updatable<O> {
  update(options: O): void
  destroy(): void
}

/**
 * Attach one of core's small engines (`attachSwitch`, `attachCheckbox`, ...) to an element
 * after mount, while `enabled`. Options are re-sent (whole) whenever they change (deep
 * compare), like the Vue components' `watch(options, h.update)`.
 */
export function useAttached<O, H extends Updatable<O>>(
  target: RefObject<Element | null>,
  attach: (el: HTMLElement, options: O) => H,
  options: O,
  enabled = true,
): H | null {
  const [handle, setHandle] = useState<H | null>(null)
  const sent = useRef(options)
  const latest = useRef(options)
  latest.current = options

  useIsomorphicLayoutEffect(() => {
    if (!enabled) return
    const el = target.current
    if (!el || el.nodeType !== 1) return
    sent.current = latest.current
    const h = attach(el as HTMLElement, sent.current)
    setHandle(h)
    return () => {
      h.destroy()
      setHandle(null)
    }
    // `attach` is a module-level core function.
  }, [enabled, target])

  useIsomorphicLayoutEffect(() => {
    if (!handle || sameValue(sent.current, options)) return
    sent.current = options
    handle.update(options)
  })

  return handle
}

'use client'
// GoopPageTransition: @goopui/vue's GoopPageTransition for React, with no router dependency, so
// it works in a Next.js App Router app (and any other React router). It renders only its
// children; core's `createPageTransition` mounts a fixed, aria-hidden goo band (created after
// hydration, so server markup never contains it) that pours in from one edge and drains out
// the other, the seam between the old page and the new one.
//
// Drop it in once, around the page (Next.js: in a client component used by the root layout):
//
//   <GoopPageTransition>{children}</GoopPageTransition>
//
// It then runs on in-app link clicks: a click on a same-origin link to another path (a plain
// <a> or Next's <Link>; no modifier keys, no target, no download) is held, the goo covers, and
// the click is let through again, so the router navigates as usual. The reveal follows the new
// page: when `routeKey` changes (pass Next's `usePathname()` for the exact commit), else when
// the URL changes. Programmatic navigation: `useGoopPageTransition().navigate(() =>
// router.push('/x'))`, or `cover()` / `reveal()` yourself. Back / forward (popstate) can't be
// held, so they don't transition, as in a plain App Router app. Reduced motion: a quick fade.
import { createPageTransition, type PageTransitionHandle } from '@goopui/core'
import { createContext, useContext, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { PAGE_TRANSITION_PROP_KEYS, splitProps, toPageTransitionOptions, type GoopPageTransitionProps } from '../../goop-props'
import { useIsomorphicLayoutEffect, useStableValue } from '../../utils'

/** What `useGoopPageTransition()` and `goopRef` give you. */
export interface GoopPageTransitionApi {
  /** Pour the goo in; resolves once the page is covered (at once before mount / when off). */
  cover(): Promise<void>
  /** Drain it out; waits for a running cover. Resolves when the overlay is gone. */
  reveal(): Promise<void>
  /** Cover, then call `go` (e.g. `() => router.push('/about')`); the reveal follows the new
   *  page (`routeKey` change, else URL change, else `revealTimeout`). */
  navigate(go: () => void): Promise<void>
  /** Does the next (or running) transition split the pages, the band as the seam? */
  splits(): boolean
  /** The live core handle; null on the server and before mount. */
  readonly handle: PageTransitionHandle | null
}

export type GoopPageTransitionRootProps = GoopPageTransitionProps & {
  children?: ReactNode
  /** Changes when the new page has rendered (Next.js: `usePathname()`). Without it the reveal
   *  waits for the URL to change. */
  routeKey?: string
  /** Run on in-app link clicks (same origin, another path, plain left click). Default true. */
  links?: boolean
  /** Element (selector) to fade in as the new page swaps in behind the band, or false
   *  (default). Never used when the transition splits (nothing swaps in view). */
  fade?: string | false
  /** Fade length (ms). Default 200. */
  fadeDuration?: number
  /** Reveal anyway this long (ms) after a navigation that never lands. Default 4000. */
  revealTimeout?: number
  /** Receives the API (cover, reveal, navigate, handle). */
  goopRef?: Ref<GoopPageTransitionApi>
}

const PageTransitionContext = createContext<GoopPageTransitionApi | null>(null)

const NOOP: GoopPageTransitionApi = {
  cover: () => Promise.resolve(),
  reveal: () => Promise.resolve(),
  navigate: (go) => {
    go()
    return Promise.resolve()
  },
  splits: () => false,
  handle: null,
}

/** The nearest GoopPageTransition's API. Outside one: a no-op (navigate just calls `go`). */
export function useGoopPageTransition(): GoopPageTransitionApi {
  return useContext(PageTransitionContext) ?? NOOP
}

const frame = (): Promise<void> =>
  new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : resolve()))

const reducedMotion = (): boolean =>
  document.documentElement.dataset.reducedMotion === 'true' ||
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)

/** Fade `target` in from transparent (Web Animations), so a page swapping in while part of the
 *  screen is visible never pops. No-op without a match or under reduced motion. */
function fadeIn(target: string | false | undefined, ms: number): void {
  if (!target || typeof document === 'undefined' || reducedMotion()) return
  const el = document.querySelector(target)
  if (!el || typeof (el as HTMLElement).animate !== 'function') return
  ;(el as HTMLElement).animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.max(0, ms), easing: 'cubic-bezier(0.2, 0, 0.2, 1)' })
}

/** The anchor a click should run the transition for, or null. */
function transitionLink(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null
  let url: URL
  try {
    url = new URL(a.href, location.href)
  } catch {
    return null
  }
  if (url.origin !== location.origin || url.pathname === location.pathname) return null
  return a
}

/** A navigation in flight. */
interface Pending {
  /** `routeKey` when it started (undefined: wait for the URL instead). */
  key: string | undefined
  url: string
  split: boolean
  timer: ReturnType<typeof setTimeout> | null
  poll: ReturnType<typeof setInterval> | null
}

export function GoopPageTransition(allProps: GoopPageTransitionRootProps) {
  const [engine, props] = splitProps(allProps, PAGE_TRANSITION_PROP_KEYS)
  const { children, routeKey, links = true, fade = false, fadeDuration = 200, revealTimeout = 4000, goopRef } = props
  const config = useGoopConfig()
  const options = useStableValue(toPageTransitionOptions(engine, config))

  const handle = useRef<PageTransitionHandle | null>(null)
  const latest = useRef({ options, routeKey, fade, fadeDuration, revealTimeout })
  latest.current = { options, routeKey, fade, fadeDuration, revealTimeout }
  /** A navigation in flight: what it waits for before revealing. */
  const pending = useRef<Pending | null>(null)
  const isPending = (p: Pending): boolean => pending.current === p

  // Mount core's overlay after hydration; destroy it on unmount.
  useIsomorphicLayoutEffect(() => {
    const h = createPageTransition(latest.current.options)
    handle.current = h
    return () => {
      const p = pending.current
      if (p?.timer) clearTimeout(p.timer)
      if (p?.poll) clearInterval(p.poll)
      pending.current = null
      h.destroy()
      handle.current = null
    }
  }, [])
  useIsomorphicLayoutEffect(() => {
    handle.current?.update(options)
  }, [options])

  const { api, land } = useMemo(() => {
    const splits = () => (handle.current?.seam ?? null) !== null
    /** The new page is here: drain. Split: at once (rendering may be paused for a view
     *  transition until it does); else after the next paint, with the optional fade. */
    const land = async () => {
      const p = pending.current
      if (!p) return
      pending.current = null
      if (p.timer) clearTimeout(p.timer)
      if (p.poll) clearInterval(p.poll)
      if (p.split) return void handle.current?.reveal()
      fadeIn(latest.current.fade, latest.current.fadeDuration)
      await frame()
      void handle.current?.reveal()
    }
    const self: GoopPageTransitionApi = {
      cover: () => handle.current?.cover() ?? Promise.resolve(),
      reveal: () => handle.current?.reveal() ?? Promise.resolve(),
      splits,
      get handle() {
        return handle.current
      },
      async navigate(go) {
        const h = handle.current
        if (!h || pending.current) {
          go()
          return
        }
        const split = splits()
        const at: Pending = { key: latest.current.routeKey, url: location.href, split, timer: null, poll: null }
        pending.current = at
        await h.cover()
        if (!isPending(at)) return
        go()
        // Already landed (a synchronous router)? Else wait for routeKey / the URL, with a
        // timeout for a navigation that never lands. Timers, not frames: a view transition
        // pauses rendering (and rAF) until the reveal.
        if (at.key === undefined) {
          at.poll = setInterval(() => {
            if (location.href !== at.url) void land()
          }, 16)
        }
        at.timer = setTimeout(() => void land(), latest.current.revealTimeout)
        if (at.key !== undefined && latest.current.routeKey !== at.key) void land()
      },
    }
    return { api: self, land }
  }, [])

  // The route committed: reveal.
  useIsomorphicLayoutEffect(() => {
    const p = pending.current
    if (p && routeKey !== undefined && p.key !== undefined && routeKey !== p.key) void land()
  }, [routeKey])

  // In-app link clicks: hold the click, cover, then let it through again.
  const linksOn = links && options.enabled !== false
  useIsomorphicLayoutEffect(() => {
    if (!linksOn) return
    let bypass: HTMLAnchorElement | null = null
    const onClick = (e: MouseEvent) => {
      const a = transitionLink(e)
      if (!a || a === bypass || pending.current || !handle.current) return
      e.preventDefault()
      e.stopPropagation()
      void api.navigate(() => {
        if (!a.isConnected) return void location.assign(a.href)
        bypass = a
        try {
          a.click()
        } finally {
          bypass = null
        }
      })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [linksOn, api])

  useImperativeHandle(goopRef, () => api, [api])

  return <PageTransitionContext.Provider value={api}>{children}</PageTransitionContext.Provider>
}

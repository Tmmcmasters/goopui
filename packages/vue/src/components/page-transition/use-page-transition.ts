import { createPageTransition, type PageTransitionHandle } from '@goopui/core'
import { nextTick, onBeforeUnmount, onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { useGoopConfig } from '../../config'
import { toPageTransitionOptions, type GoopPageTransitionProps } from '../../goop-props'

export interface UseGoopPageTransitionReturn {
  /** Pour the goo in; resolves once the viewport is covered (at once before mount / off). */
  cover(): Promise<void>
  /** Drain it out; waits for a running cover. Resolves when the overlay is gone. */
  reveal(): Promise<void>
  /** The live core handle; null on the server and before mount. */
  handle: ShallowRef<PageTransitionHandle | null>
}

/**
 * A goo page transition for the lifetime of the calling component: core's
 * `createPageTransition` (a fixed, aria-hidden overlay, mounted on the first cover), updated
 * when the options change, destroyed on unmount. SSR-safe: nothing runs until onMounted.
 */
export function useGoopPageTransition(options: MaybeRefOrGetter<GoopPageTransitionProps> = {}): UseGoopPageTransitionReturn {
  const config = useGoopConfig()
  const handle = shallowRef<PageTransitionHandle | null>(null)
  const resolved = (): ReturnType<typeof toPageTransitionOptions> => toPageTransitionOptions(toValue(options), config)
  onMounted(() => {
    handle.value = createPageTransition(resolved())
  })
  onBeforeUnmount(() => {
    handle.value?.destroy()
    handle.value = null
  })
  watch(resolved, (next) => handle.value?.update(next), { deep: true })
  return {
    cover: () => handle.value?.cover() ?? Promise.resolve(),
    reveal: () => handle.value?.reveal() ?? Promise.resolve(),
    handle,
  }
}

/** The bits of a route the router hooks read (vue-router's RouteLocationNormalized fits). */
export interface GoopTransitionRoute {
  path: string
  matched: readonly unknown[]
}

/** The bits of a router the hooks use (vue-router's Router fits). */
export interface GoopTransitionRouter {
  beforeEach(guard: (to: GoopTransitionRoute, from: GoopTransitionRoute) => unknown): () => void
  afterEach(hook: (to: GoopTransitionRoute, from: GoopTransitionRoute, failure?: unknown) => unknown): () => void
  onError?(handler: (error: unknown) => unknown): () => void
}

export interface GoopRouterTransitionOptions {
  /** When to drain: 'afterEach' (default: after the route commits and the next frame
   *  paints) or 'manual' (call `transition.reveal()` yourself, e.g. on Nuxt's page:finish). */
  revealOn?: 'afterEach' | 'manual'
  /** Return false to skip the transition for a navigation. Default: path changes only
   *  (hash / query changes and the first navigation skip). */
  when?: (to: GoopTransitionRoute, from: GoopTransitionRoute) => boolean
  /** Fade the new page in as it swaps in behind / around the band: a selector for the
   *  element to fade (default GOOP_PAGE_FADE_TARGET, the app root), or false for none.
   *  With revealOn 'manual', call `goopPageFadeIn()` yourself when the new page renders. */
  fade?: string | false
  /** Fade length (ms). Default 200. */
  fadeDuration?: number
}

/** Elements the new-page fade looks for, first match wins (Nuxt's root, then Vue's usual). */
export const GOOP_PAGE_FADE_TARGET = '#__nuxt, #app'

/**
 * Fade the element matching `target` in from transparent (Web Animations, `ms` long), so a
 * page swapping in while part of the screen is visible never pops. Call it in the same tick
 * the new page renders (before the next paint). No-op without a match, without
 * `Element.animate`, or under reduced motion.
 */
export function goopPageFadeIn(target: string | false = GOOP_PAGE_FADE_TARGET, ms = 200): void {
  if (!target || typeof document === 'undefined') return
  if (document.documentElement.dataset.reducedMotion === 'true') return
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = document.querySelector(target)
  if (!el || typeof (el as HTMLElement).animate !== 'function') return
  ;(el as HTMLElement).animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.max(0, ms), easing: 'cubic-bezier(0.2, 0, 0.2, 1)' })
}

const frame = (): Promise<void> =>
  new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : resolve()))

/**
 * Run `transition` on route changes: `beforeEach` waits for the cover, so the old page is
 * hidden before it changes; the reveal runs once the new page has rendered. A failed or
 * cancelled navigation reveals too. Returns a function that removes the hooks.
 */
export function goopRouterTransition(
  router: GoopTransitionRouter,
  transition: Pick<UseGoopPageTransitionReturn, 'cover' | 'reveal'>,
  options: GoopRouterTransitionOptions = {},
): () => void {
  const when = options.when ?? ((to, from) => from.matched.length > 0 && to.path !== from.path)
  let swapping = false
  const offs = [
    router.beforeEach(async (to, from) => {
      if (!when(to, from)) return
      swapping = true
      await transition.cover()
    }),
    router.afterEach(async (_to, _from, failure) => {
      const swapped = swapping
      swapping = false
      if (failure) return void transition.reveal()
      if (options.revealOn === 'manual') return
      await nextTick()
      // The new page is in the DOM but not painted yet: fade it in behind the band.
      if (swapped) goopPageFadeIn(options.fade ?? GOOP_PAGE_FADE_TARGET, options.fadeDuration ?? 200)
      await frame()
      void transition.reveal()
    }),
  ]
  if (router.onError) offs.push(router.onError(() => void transition.reveal()))
  return () => {
    for (const off of offs) off()
  }
}

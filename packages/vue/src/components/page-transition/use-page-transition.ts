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
  const offs = [
    router.beforeEach(async (to, from) => {
      if (when(to, from)) await transition.cover()
    }),
    router.afterEach(async (_to, _from, failure) => {
      if (failure) return void transition.reveal()
      if (options.revealOn === 'manual') return
      await nextTick()
      await frame()
      void transition.reveal()
    }),
  ]
  if (router.onError) offs.push(router.onError(() => void transition.reveal()))
  return () => {
    for (const off of offs) off()
  }
}

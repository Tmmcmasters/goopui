import type { RouterConfig } from 'nuxt/schema'
import { canonicalPath } from '~/composables/useFramework'

// Scroll on navigation. Waits for the new page to render (page:finish), sets the native
// scroll position instantly, and snaps Lenis to the same spot so its internal target
// doesn't drag the page back toward the old position.
function positionFor(hash: string, saved: { top: number } | null): number {
  if (saved) return saved.top
  if (hash) {
    const el = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (el) return Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerOffset())
  }
  return 0
}

function settle(top: number) {
  const lenis = getLenis()
  if (lenis) {
    lenis.resize()
    lenis.scrollTo(top, { immediate: true, force: true })
  }
  return { top, left: 0, behavior: 'instant' as ScrollBehavior }
}

export default {
  scrollBehavior(to, from, savedPosition) {
    // Same page (hash or query change): no page:finish will fire, so answer now.
    if (to.path === from.path) {
      if (to.hash === from.hash) return false
      return settle(positionFor(to.hash, savedPosition))
    }
    // The same docs page in the other framework (the header's Vue / React switch): stay where
    // the reader was. The two pages share their markdown, so the layout barely moves.
    const keep = canonicalPath(to.path) === canonicalPath(from.path) && !to.hash ? window.scrollY : null
    const nuxtApp = useNuxtApp()
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce('page:finish', () => {
        requestAnimationFrame(() => resolve(settle(keep ?? positionFor(to.hash, savedPosition))))
      })
    })
  },
} satisfies RouterConfig

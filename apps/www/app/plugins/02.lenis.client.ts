// Smooth scroll with Lenis.
// - Never created under reduced motion (OS setting or the site switch); destroyed live if
//   the preference flips on, recreated if it flips off.
// - Same-page anchor clicks (TOC, heading anchors, "#install" CTAs) go through
//   lenis.scrollTo; the header offset comes from <html>'s scroll-padding-top.
// - Nested scrollers opt out with data-lenis-prevent (docs sidebar, TOC, mobile nav) or
//   data-lenis-prevent-horizontal (code blocks).
// - Route changes are handled in app/router.options.ts, which syncs Lenis after the
//   new page has rendered.
import Lenis from 'lenis'

export default defineNuxtPlugin(() => {
  const { reduced } = useMotionPreference()
  const router = useRouter()

  let lenis: Lenis | null = null

  const create = () => {
    if (lenis) return
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.115,
      wheelMultiplier: 1,
      // We route anchors ourselves (below) so focus + history are handled too.
      anchors: false,
      stopInertiaOnNavigate: true,
    })
    setLenis(lenis)
  }
  const destroy = () => {
    lenis?.destroy()
    lenis = null
    setLenis(null)
  }

  watch(reduced, (r) => (r ? destroy() : create()), { immediate: true })

  // Kill any in-flight smooth scroll the moment a navigation starts, so it can't fight
  // the scroll position the router sets for the next page.
  router.beforeEach(() => {
    if (lenis) lenis.scrollTo(window.scrollY, { immediate: true, force: true })
  })

  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)))
      if (!el) return
      e.preventDefault()
      scrollToElement(el)
      focusSection(el)
      // Keep vue-router's history state; only the hash changes.
      history.replaceState(history.state, '', url.hash)
    },
    { capture: true },
  )
})

import type Lenis from 'lenis'

// Module singleton so the router's scrollBehavior and components can reach the
// current Lenis instance (or know there isn't one: reduced motion).
let current: Lenis | null = null

export function setLenis(l: Lenis | null) {
  current = l
}

export function getLenis(): Lenis | null {
  return current
}

/** Same as the CSS `scroll-padding-top` on <html>: header height + breathing room. */
export function headerOffset(): number {
  const pad = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
  return Number.isFinite(pad) ? pad : 84
}

const easeOutQuart = (t: number) => 1 - (1 - t) ** 4

/**
 * Scroll to an element, clearing the fixed header. Smooth through Lenis when it is running,
 * instant otherwise (reduced motion). Lenis reads <html>'s scroll-padding-top itself, so
 * the header offset is applied in both paths without double counting.
 */
export function scrollToElement(el: HTMLElement) {
  const lenis = getLenis()
  if (lenis) {
    const distance = Math.abs(el.getBoundingClientRect().top - headerOffset())
    // Short hops feel snappy, long jumps don't drag on.
    const duration = Math.min(1.1, 0.55 + distance / 5000)
    lenis.scrollTo(el, { duration, easing: easeOutQuart })
  } else {
    el.scrollIntoView({ block: 'start', behavior: 'auto' })
  }
}

/** Move keyboard focus to a section without scrolling, so Tab continues from there. */
export function focusSection(el: HTMLElement) {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

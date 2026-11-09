// The site chrome's ONE highlight blob (docs nav, TOC, header, framework switch): @goopui/vue's
// useGoopListHighlight over the list's `[data-chrome-item]` elements. The list carries
// `data-chrome-goo` (main.css colours the blob and drops the items' own flat background once
// it attaches). Reduced motion (the OS or the site's "Reduce motion" switch, which core reads
// from <html data-reduced-motion>) makes the blob snap instead of travel.
import { TABS_FEEL, type ListHighlightOptions } from '@goopui/core'
import { useGoopListHighlight } from '@goopui/vue'

export const CHROME_ITEM = '[data-chrome-item]'

export function useChromeGoo(
  target: () => HTMLElement | null | undefined,
  options: {
    /** The resting item (current page, section in view, selected option). */
    active?: string
    /** A row (header, switch): the tabs feel, no pointer-follow swell. Default: a column. */
    row?: boolean
    /** Hover / keyboard focus move the blob. Default true. false: it only marks `active`. */
    follow?: boolean
  } = {},
) {
  return useGoopListHighlight(target, (): ListHighlightOptions => ({
    items: CHROME_ITEM,
    active: options.active,
    hover: options.follow,
    focus: options.follow,
    ...(options.row ? { feel: TABS_FEEL, followPointer: false } : {}),
  }))
}

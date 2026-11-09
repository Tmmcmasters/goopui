// shadcn/ui's ScrollArea classes (style `radix-nova`, the same as @goopui/react's). shadcn writes
// `data-horizontal:` / `data-vertical:`; spelled out as the `data-[orientation=...]` the
// scrollbar carries.
export const SCROLL_AREA = 'relative'
export const SCROLL_AREA_VIEWPORT =
  'size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1'
export const SCROLL_AREA_SCROLLBAR =
  'flex touch-none p-px transition-colors select-none data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-l-transparent'
export const SCROLL_AREA_THUMB = 'relative flex-1 rounded-full bg-border'

/** With the goo on, the thumb's colour moves onto its goo body (one span filling the thumb),
 *  so the body can stretch and squash while the primitive keeps translating the thumb. Decided
 *  by props alone, so server and client markup match. */
export const SCROLL_AREA_THUMB_GOO = 'relative flex-1 rounded-full'
export const SCROLL_AREA_THUMB_BODY = 'pointer-events-none absolute inset-0 rounded-[inherit] bg-border'

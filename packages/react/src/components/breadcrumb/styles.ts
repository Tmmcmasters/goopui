// shadcn/ui's Breadcrumb classes (React, style `radix-nova`; shadcn-vue's reka-nova is the
// same), verbatim, plus the goo link padding.
export const BREADCRUMB_LIST = 'flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground'
export const BREADCRUMB_ITEM = 'inline-flex items-center gap-1'
export const BREADCRUMB_LINK = 'transition-colors hover:text-foreground'
export const BREADCRUMB_PAGE = 'font-normal text-foreground'
export const BREADCRUMB_SEPARATOR = '[&>svg]:size-3.5'
export const BREADCRUMB_ELLIPSIS = 'flex size-5 items-center justify-center [&>svg]:size-4'

/** Under the goo blob a link gets a little room around its text for the blob, given back with
 *  equal negative margins (no layout shift), and the lit link (hover or keyboard) is foreground. */
export const goopBreadcrumbLink = 'rounded-md px-1 -mx-1 py-0.5 -my-0.5 data-[goop-lit]:text-foreground'

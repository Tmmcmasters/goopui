// shadcn-vue's Breadcrumb classes (reka-nova), verbatim, plus the goo link padding.
export const BREADCRUMB_LIST = 'text-muted-foreground gap-1.5 text-sm flex flex-wrap items-center wrap-break-word'
export const BREADCRUMB_ITEM = 'gap-1 inline-flex items-center'
export const BREADCRUMB_LINK = 'hover:text-foreground transition-colors'
export const BREADCRUMB_PAGE = 'text-foreground font-normal'
export const BREADCRUMB_SEPARATOR = '[&>svg]:size-3.5'
export const BREADCRUMB_ELLIPSIS = 'size-5 [&>svg]:size-4 flex items-center justify-center'

/** Under the goo blob a link gets a little room around its text for the blob, given back with
 *  equal negative margins (no layout shift), and the lit link (hover or keyboard) is foreground. */
export const goopBreadcrumbLink = 'rounded-md px-1 -mx-1 py-0.5 -my-0.5 data-[goop-lit]:text-foreground'

// shadcn/ui's Pagination classes (React, style `radix-nova`), plus the goo version of the
// current page (same as @goopui/vue).
import { buttonVariants, type ButtonSize } from '../button/variants'

export const PAGINATION = 'mx-auto flex w-full justify-center'
export const PAGINATION_CONTENT = 'flex items-center gap-0.5'
export const PAGINATION_ELLIPSIS = "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4"

/** Under the goo blob the current page is a ghost button whose hover doesn't cover the blob
 *  (the blob paints shadcn's outline look, goop.css). */
const CURRENT_GOO = 'text-foreground hover:bg-transparent dark:hover:bg-transparent'

/** shadcn's PaginationLink classes, or the goo version under the blob. */
export function paginationItemClass(current: boolean, size: ButtonSize, blob: boolean): string {
  if (!blob) return buttonVariants({ variant: current ? 'outline' : 'ghost', size })
  return `${buttonVariants({ variant: 'ghost', size })} ${current ? CURRENT_GOO : ''}`
}

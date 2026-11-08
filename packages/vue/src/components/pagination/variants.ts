import { buttonVariants, type ButtonSize } from '../button/variants'

/** Under the goo blob the current page is a ghost button whose hover doesn't cover the blob
 *  (the blob paints shadcn's outline look, goop.css). */
const CURRENT_GOO = 'text-foreground hover:bg-transparent dark:hover:bg-transparent'

/** shadcn's PaginationItem / PaginationLink classes, or the goo version under the blob. */
export function paginationItemClass(current: boolean, size: ButtonSize, blob: boolean): string {
  if (!blob) return buttonVariants({ variant: current ? 'outline' : 'ghost', size })
  return `${buttonVariants({ variant: 'ghost', size })} ${current ? CURRENT_GOO : ''}`
}

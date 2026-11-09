// shadcn-vue's Table classes (style `reka-nova`; same set as shadcn/ui React radix-nova), verbatim.
export const TABLE_CONTAINER = 'relative w-full overflow-x-auto'
export const TABLE = 'w-full caption-bottom text-sm'
export const TABLE_HEADER = '[&_tr]:border-b'
export const TABLE_BODY = '[&_tr:last-child]:border-0'
export const TABLE_FOOTER = 'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0'
export const TABLE_ROW = 'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted'
export const TABLE_HEAD = 'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0'
export const TABLE_CELL = 'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0'
export const TABLE_CAPTION = 'mt-4 text-sm text-muted-foreground'
/** shadcn-vue's TableEmpty cell. */
export const TABLE_EMPTY_CELL = 'p-4 whitespace-nowrap align-middle text-sm text-foreground'

// shadcn-vue's Calendar classes (style `reka-nova`), verbatim. The day trigger and the prev /
// next buttons start from `buttonVariants` (ghost / outline) like shadcn's, merged with `cn`.
// The goo overrides (the selected day's and the cell's flat backgrounds stepping aside once the
// goo is attached) live in goop.css under `[data-goop-calendar]`, so SSR and `goo: false`
// render plain shadcn.

export const CALENDAR =
  'p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] group/calendar bg-background in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent'

export const CALENDAR_HEADER = 'flex justify-center pt-1 relative items-center w-full px-8'

export const CALENDAR_HEADING = 'text-sm font-medium'

/** The prev / next buttons' row (shadcn's Calendar.vue `<nav>`). */
export const CALENDAR_NAV = 'pointer-events-none flex items-center gap-1 absolute top-0 inset-x-0 justify-between'

/** On top of `buttonVariants({ variant: 'outline' })`. */
export const CALENDAR_NAV_BUTTON = 'pointer-events-auto size-7 bg-transparent p-0 opacity-50 hover:opacity-100'

/** The months' row (shadcn's wrapper around the grids). */
export const CALENDAR_MONTHS = 'flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0'

export const CALENDAR_GRID = 'w-full border-collapse space-x-1'

export const CALENDAR_GRID_ROW = 'flex'

/** A week row of the body (shadcn's Calendar.vue passes it to CalendarGridRow). */
export const CALENDAR_WEEK = 'mt-2 w-full'

export const CALENDAR_HEAD_CELL = 'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]'

export const CALENDAR_CELL =
  'relative p-0 text-center text-sm flex-1 focus-within:relative focus-within:z-20 [&:has([data-selected])]:rounded-md [&:has([data-selected])]:bg-accent'

/** On top of `buttonVariants({ variant: 'ghost' })`. */
export const CALENDAR_CELL_TRIGGER = [
  'size-8 p-0 font-normal aria-selected:opacity-100 cursor-default',
  '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
  // Selected
  'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100 data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground',
  // Disabled
  'data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
  // Unavailable
  'data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through',
  // Outside months
  'data-[outside-view]:text-muted-foreground',
].join(' ')

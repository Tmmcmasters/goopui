// shadcn-vue's RangeCalendar classes (style `reka-nova`), verbatim. The day trigger and the
// prev / next buttons start from `buttonVariants` (ghost / outline) like shadcn's, merged with
// `cn`. The goo overrides (the range's flat cell background and the caps' primary background
// stepping aside once the goo is attached) live in goop.css under `[data-goop-calendar]`, so
// SSR and `goo: false` render plain shadcn.

export const RANGE_CALENDAR = 'p-3'

export const RANGE_CALENDAR_HEADER = 'flex justify-center pt-1 relative items-center w-full'

export const RANGE_CALENDAR_HEADING = 'text-sm font-medium'

/** The prev / next buttons' wrapper (shadcn's RangeCalendar.vue). */
export const RANGE_CALENDAR_NAV = 'flex items-center gap-1'

/** On top of `buttonVariants({ variant: 'outline' })`. */
export const RANGE_CALENDAR_PREV_BUTTON = 'absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100'
/** On top of `buttonVariants({ variant: 'outline' })`. */
export const RANGE_CALENDAR_NEXT_BUTTON = 'absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100'

/** The months' row (shadcn's wrapper around the grids). */
export const RANGE_CALENDAR_MONTHS = 'flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0'

export const RANGE_CALENDAR_GRID = 'w-full border-collapse space-x-1'

export const RANGE_CALENDAR_GRID_ROW = 'flex'

/** A week row of the body (shadcn's RangeCalendar.vue passes it to RangeCalendarGridRow). */
export const RANGE_CALENDAR_WEEK = 'mt-2 w-full'

export const RANGE_CALENDAR_HEAD_CELL = 'w-8 rounded-md text-[0.8rem] font-normal text-muted-foreground'

export const RANGE_CALENDAR_CELL =
  'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md [&:has([data-selected][data-selection-end])]:rounded-r-md [&:has([data-selected][data-selection-start])]:rounded-l-md'

/** On top of `buttonVariants({ variant: 'ghost' })`. */
export const RANGE_CALENDAR_CELL_TRIGGER = [
  'h-8 w-8 p-0 font-normal data-[selected]:opacity-100',
  '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
  // Selection Start
  'data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-start]:hover:bg-primary data-[selection-start]:hover:text-primary-foreground data-[selection-start]:focus:bg-primary data-[selection-start]:focus:text-primary-foreground',
  // Selection End
  'data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-end]:hover:bg-primary data-[selection-end]:hover:text-primary-foreground data-[selection-end]:focus:bg-primary data-[selection-end]:focus:text-primary-foreground',
  // Outside months
  'data-[outside-view]:text-muted-foreground',
  // Disabled
  'data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
  // Unavailable
  'data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through',
].join(' ')

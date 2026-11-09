// shadcn/ui's Calendar classes (React, style `radix-nova`, react-day-picker), verbatim. The day
// button and the prev / next buttons start from `buttonVariants` like shadcn's. The goo
// overrides (the selected day's / the range's flat backgrounds and the ghost hover stepping
// aside once the goo is attached) live in goop.css under `[data-goop-calendar]`, so SSR and
// `goo={false}` render plain shadcn.

export const CALENDAR = String.raw`group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent rtl:**:[.rdp-button\_next>svg]:rotate-180 rtl:**:[.rdp-button\_previous>svg]:rotate-180`

/** react-day-picker `classNames` (each joined with rdp's default class by the component). */
export const CALENDAR_CLASS_NAMES = {
  root: 'w-fit',
  months: 'relative flex flex-col gap-4 md:flex-row',
  month: 'flex w-full flex-col gap-4',
  nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
  /** On top of `buttonVariants({ variant: buttonVariant })`. */
  button_previous: 'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
  /** On top of `buttonVariants({ variant: buttonVariant })`. */
  button_next: 'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
  month_caption: 'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
  dropdowns: 'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
  dropdown_root: 'cn-calendar-dropdown-root relative rounded-(--cell-radius)',
  dropdown: 'absolute inset-0 bg-popover opacity-0',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday: 'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none',
  week: 'mt-2 flex w-full',
  week_number_header: 'w-(--cell-size) select-none',
  week_number: 'text-[0.8rem] text-muted-foreground select-none',
  range_start: 'relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted',
  range_middle: 'rounded-none',
  range_end: 'relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted',
  today: 'rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none',
  outside: 'text-muted-foreground aria-selected:text-muted-foreground',
  disabled: 'text-muted-foreground opacity-50',
  hidden: 'invisible',
} as const

/** The caption label: `captionLayout="label"` vs the dropdown layouts. */
export const CALENDAR_CAPTION_LABEL = 'font-medium select-none'
export const CALENDAR_CAPTION_LABEL_TEXT = 'cn-calendar-caption text-sm'
export const CALENDAR_CAPTION_LABEL_DROPDOWN =
  'cn-calendar-caption-label flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground'

/** The day cell (`<td>`); the first / last selected day of a week rounds its button. */
export const CALENDAR_DAY =
  'group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)'
export const CALENDAR_DAY_FIRST = '[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)'
export const CALENDAR_DAY_FIRST_WEEK_NUMBER = '[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)'

/** shadcn's CalendarDayButton, on top of `buttonVariants({ variant: 'ghost', size: 'icon' })`. */
export const CALENDAR_DAY_BUTTON =
  'relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70'

/** The week number cell's inner box. */
export const CALENDAR_WEEK_NUMBER_INNER = 'flex size-(--cell-size) items-center justify-center text-center'

// The Combobox classes: shadcn/ui's combobox recipe (cmdk + Popover) in the same parts and
// classes as @goopui/vue's GoopCombobox (an input with the Select's chevron, and a list under
// it), with Radix Popover's CSS vars where Vue uses reka's. cmdk marks the active item
// `data-selected="true"` where reka uses `data-highlighted`.

export const COMBOBOX_ANCHOR = 'w-[200px]'

/** The ring's host around the input. */
export const COMBOBOX_INPUT_HOST = 'relative flex w-full min-w-0 items-center'
/** shadcn's Input box (border-input, h-8, rounded-lg; the `radix-nova` Input classes). */
export const COMBOBOX_INPUT =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'
/** While the goo ring is attached it is the focus indicator (the Input's rule). */
export const COMBOBOX_FIELD_ACTIVE = 'focus-visible:ring-0 aria-invalid:ring-0 focus-visible:outline-none!'

/** The chevron button: GoopSelect's chevron (size-4), in a box at least 32px wide and 24px tall
 *  so it is easy to tap (`absolute inset-y-0 right-0` makes it the input's full 32px height). */
export const COMBOBOX_TRIGGER =
  'text-muted-foreground hover:text-foreground inline-flex min-h-6 min-w-8 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

/** shadcn's list (`goo={false}`): the popover panel with its CSS enter / exit. */
export const COMBOBOX_LIST_SHADCN =
  'relative z-50 w-(--radix-popover-trigger-width) max-w-(--radix-popover-content-available-width) rounded-lg bg-popover text-popover-foreground origin-(--radix-popover-content-transform-origin) overflow-hidden shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
/** Goo on: the goo paints the background (popover color), ring and shadow; no CSS enter / exit,
 *  and no overflow on the panel (the goo pokes past it while it blooms). */
export const COMBOBOX_LIST_GOO =
  'text-popover-foreground [--goop-color:var(--popover)] z-50 w-(--radix-popover-trigger-width) max-w-(--radix-popover-content-available-width) rounded-lg flex flex-col outline-none max-h-(--radix-popover-content-available-height)'
/** The scroller (cmdk's list); its sizer holds the highlight and clips its goo. */
export const COMBOBOX_SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-x-hidden overflow-y-auto max-h-72'
export const COMBOBOX_SCROLL_GOO = '[&>[cmdk-list-sizer]]:relative [&>[cmdk-list-sizer]]:overflow-clip'

export const COMBOBOX_EMPTY = 'text-muted-foreground flex w-full justify-center py-2 text-center text-sm'
export const COMBOBOX_GROUP = 'text-foreground overflow-hidden p-1 **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs'
export const COMBOBOX_SEPARATOR = 'bg-border -mx-1 my-1 h-px'

/** shadcn's flat highlight, used when the goo blob is off. */
export const COMBOBOX_ITEM_FLAT = 'data-[selected=true]:bg-accent'
export const COMBOBOX_ITEM =
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-[selected=true]:text-accent-foreground not-data-[variant=destructive]:data-[selected=true]:**:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
export const COMBOBOX_ITEM_INDICATOR = 'pointer-events-none absolute right-2 flex size-4 items-center justify-center'

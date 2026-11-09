// shadcn/ui's Command classes (React, style `radix-nova`; the same set as @goopui/vue's
// GoopCommand), on cmdk: cmdk marks the active item `data-selected="true"` and a disabled one
// `data-disabled="true"` (both attributes are always present, "false" otherwise), so the
// highlight styles key off `data-[selected=true]` where the Vue port (reka) uses
// `data-highlighted`.

export const COMMAND = 'bg-popover text-popover-foreground flex size-full flex-col overflow-hidden rounded-xl p-1'

/** The input's wrapper: a little more room while the goo ring is on (it swells past the box). */
export const COMMAND_INPUT_WRAPPER = 'p-1 pb-0'
export const COMMAND_INPUT_WRAPPER_GOO = 'px-1.5 pt-1.5 pb-1'
/** The ring's host around the input and its search icon. */
export const COMMAND_INPUT_HOST = 'relative flex w-full min-w-0 items-center'
export const COMMAND_INPUT_ICON = 'pointer-events-none absolute left-2.5 z-1 size-4 shrink-0 opacity-50'
/** shadcn's InputGroup look (h-8, rounded-lg, bg-input/30) flattened onto the input. */
export const COMMAND_INPUT =
  'bg-input/30 border-input/30 placeholder:text-muted-foreground h-8 w-full min-w-0 rounded-lg border pr-2.5 pl-8 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50'
/** While the goo ring is attached it is the focus indicator (the Input's rule). */
export const COMMAND_FIELD_ACTIVE = 'focus-visible:ring-0 aria-invalid:ring-0 focus-visible:outline-none!'

export const COMMAND_LIST = 'max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none'
/** The goo highlight lives in cmdk's list sizer, which clips its overshoot (`overflow: clip`, so
 *  it never adds scroll overflow). */
export const COMMAND_LIST_GOO = '[&>[cmdk-list-sizer]]:relative [&>[cmdk-list-sizer]]:overflow-clip'

export const COMMAND_EMPTY = 'py-6 text-center text-sm'
export const COMMAND_GROUP =
  'overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground'
export const COMMAND_SEPARATOR = 'bg-border -mx-1 h-px'

/** shadcn's flat highlight, used when the goo blob is off. */
export const COMMAND_ITEM_FLAT = 'data-[selected=true]:bg-muted'
export const COMMAND_ITEM =
  "group/command-item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[selected=true]:*:[svg]:text-foreground"
export const COMMAND_SHORTCUT = 'text-muted-foreground group-data-[selected=true]/command-item:text-foreground ml-auto text-xs tracking-widest'

/** GoopCommandDialog's content (shadcn's CommandDialog: higher up, no padding, rounded-xl). */
export const COMMAND_DIALOG_CONTENT = 'top-1/3 gap-0 overflow-visible rounded-xl p-0 sm:max-w-lg'

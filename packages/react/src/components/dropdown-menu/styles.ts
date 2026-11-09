// shadcn/ui's DropdownMenu classes (React, style `radix-nova`). shadcn writes `data-open:` /
// `data-closed:`; those are spelled out as the `data-[state=...]` Radix emits.

/** shadcn's DropdownMenuContent (`goo={false}`). */
export const DROPDOWN_MENU_CONTENT_SHADCN =
  'cn-menu-target cn-menu-translucent z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'

/** Goo on: the goo paints the background (`--goop-color: var(--popover)`), ring and shadow
 *  (goop.css's drop-shadow on the surface); no CSS enter/exit. The scroller inside takes the
 *  max-height overflow. */
export const DROPDOWN_MENU_CONTENT_GOO =
  'z-50 flex max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) min-w-32 flex-col rounded-lg text-popover-foreground outline-hidden [--goop-color:var(--popover)]'

/** shadcn's DropdownMenuSubContent (`goo={false}` or the parent's `submenus={false}`). */
export const DROPDOWN_MENU_SUB_CONTENT_SHADCN =
  'cn-menu-target cn-menu-translucent z-50 min-w-[96px] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'

export const DROPDOWN_MENU_SUB_CONTENT_GOO =
  'z-50 flex max-w-(--radix-dropdown-menu-content-available-width) min-w-[96px] flex-col rounded-lg text-popover-foreground outline-hidden [--goop-color:var(--popover)]'

/** shadcn's flat item highlight: dropped while the goo blob draws it. */
export const DROPDOWN_MENU_ITEM_FLAT = 'focus:bg-accent data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20'
export const DROPDOWN_MENU_ITEM =
  "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive"

export const DROPDOWN_MENU_CHOICE_FLAT = 'focus:bg-accent'
/** Checkbox and radio items. */
export const DROPDOWN_MENU_CHOICE =
  "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
export const DROPDOWN_MENU_INDICATOR = 'pointer-events-none absolute right-2 flex items-center justify-center'

export const DROPDOWN_MENU_SUB_TRIGGER_FLAT = 'focus:bg-accent data-[state=open]:bg-accent'
export const DROPDOWN_MENU_SUB_TRIGGER =
  "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

export const DROPDOWN_MENU_LABEL = 'px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7'
export const DROPDOWN_MENU_SEPARATOR = '-mx-1 my-1 h-px bg-border'
export const DROPDOWN_MENU_SHORTCUT = 'ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground'

// shadcn/ui's ContextMenu classes (React, style `radix-nova`). shadcn writes `data-open:` /
// `data-closed:`; those are spelled out as the `data-[state=...]` Radix emits.

export const CONTEXT_MENU_TRIGGER = 'select-none'

/** shadcn's ContextMenuContent (`goo={false}`). */
export const CONTEXT_MENU_CONTENT_SHADCN =
  'cn-menu-target cn-menu-translucent z-50 max-h-(--radix-context-menu-content-available-height) min-w-36 origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'

/** Goo on: the goo paints the background, ring and shadow; no CSS enter/exit. */
export const CONTEXT_MENU_CONTENT_GOO =
  'z-50 flex max-h-(--radix-context-menu-content-available-height) min-w-36 flex-col rounded-lg text-popover-foreground outline-hidden [--goop-color:var(--popover)]'

/** shadcn's ContextMenuSubContent. */
export const CONTEXT_MENU_SUB_CONTENT_SHADCN =
  'cn-menu-target cn-menu-translucent z-50 min-w-32 origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'

export const CONTEXT_MENU_SUB_CONTENT_GOO = 'z-50 flex min-w-32 flex-col rounded-lg text-popover-foreground outline-hidden [--goop-color:var(--popover)]'

export const CONTEXT_MENU_ITEM_FLAT = 'focus:bg-accent data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20'
export const CONTEXT_MENU_ITEM =
  "group/context-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus:*:[svg]:text-accent-foreground data-[variant=destructive]:*:[svg]:text-destructive"

export const CONTEXT_MENU_CHOICE_FLAT = 'focus:bg-accent'
export const CONTEXT_MENU_CHOICE =
  "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
export const CONTEXT_MENU_INDICATOR = 'pointer-events-none absolute right-2'

export const CONTEXT_MENU_SUB_TRIGGER_FLAT = 'focus:bg-accent data-[state=open]:bg-accent'
export const CONTEXT_MENU_SUB_TRIGGER =
  "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground data-inset:pl-7 data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

export const CONTEXT_MENU_LABEL = 'px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7'
export const CONTEXT_MENU_SEPARATOR = '-mx-1 my-1 h-px bg-border'
export const CONTEXT_MENU_SHORTCUT = 'ml-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground'

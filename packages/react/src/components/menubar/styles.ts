// shadcn/ui's Menubar classes (React, style `radix-nova`). shadcn writes `data-open:` /
// `data-closed:`; those are spelled out as the `data-[state=...]` Radix emits.

export const MENUBAR = 'flex h-8 items-center gap-0.5 rounded-lg border p-[3px]'

/** shadcn's flat hover / open bg: dropped while the bar's goo body paints it. */
export const MENUBAR_TRIGGER_FLAT = 'hover:bg-muted aria-expanded:bg-muted'
export const MENUBAR_TRIGGER = 'flex items-center rounded-sm px-1.5 py-[2px] text-sm font-medium outline-hidden select-none'

/** shadcn's MenubarContent (`goo={false}`). */
export const MENUBAR_CONTENT_SHADCN =
  'cn-menu-target cn-menu-translucent z-50 min-w-36 origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'

/** Goo on: the goo paints the background, ring and shadow; no CSS enter/exit. */
export const MENUBAR_CONTENT_GOO =
  'z-50 flex max-h-(--radix-menubar-content-available-height) min-w-36 flex-col rounded-lg text-popover-foreground outline-hidden [--goop-color:var(--popover)]'

/** shadcn's MenubarSubContent. */
export const MENUBAR_SUB_CONTENT_SHADCN =
  'cn-menu-target cn-menu-translucent z-50 min-w-32 origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'

export const MENUBAR_SUB_CONTENT_GOO = 'z-50 flex min-w-32 flex-col rounded-lg text-popover-foreground outline-hidden [--goop-color:var(--popover)]'

export const MENUBAR_ITEM_FLAT = 'focus:bg-accent data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20'
export const MENUBAR_ITEM =
  "group/menubar-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive!"

export const MENUBAR_CHOICE_FLAT = 'focus:bg-accent'
export const MENUBAR_CHECKBOX_ITEM =
  'relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm outline-hidden select-none focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0'
export const MENUBAR_RADIO_ITEM =
  "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm outline-hidden select-none focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
export const MENUBAR_INDICATOR = "pointer-events-none absolute left-1.5 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4"

export const MENUBAR_SUB_TRIGGER_FLAT = 'focus:bg-accent data-[state=open]:bg-accent'
export const MENUBAR_SUB_TRIGGER =
  "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none focus:text-accent-foreground data-inset:pl-7 data-[state=open]:text-accent-foreground [&_svg:not([class*='size-'])]:size-4"

export const MENUBAR_LABEL = 'px-1.5 py-1 text-sm font-medium data-inset:pl-7'
export const MENUBAR_SEPARATOR = '-mx-1 my-1 h-px bg-border'
export const MENUBAR_SHORTCUT = 'ml-auto text-xs tracking-widest text-muted-foreground group-focus/menubar-item:text-accent-foreground'

// shadcn/ui's Kbd classes (React, style `radix-nova`; shadcn-vue's reka-nova is the same),
// verbatim.
export const KBD =
  "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3"
export const KBD_GROUP = 'inline-flex items-center gap-1'

/** With the squish on, the kbd takes clicks (shadcn's is pointer-events-none). */
export const goopKbdPressable = 'pointer-events-auto'

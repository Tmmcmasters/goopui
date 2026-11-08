// shadcn/ui's Dialog classes (React, style `radix-nova`). shadcn writes `data-open:` /
// `data-closed:`; those are spelled out as the `data-[state=...]` Radix emits.

/** shadcn's DialogOverlay (the plain fade; `overlay` off or `goo={false}`). */
export const DIALOG_OVERLAY_SHADCN =
  'fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0'

/** Goo overlay: the goo paints the dim (core `attachBackdrop`); no CSS enter/exit. */
export const DIALOG_OVERLAY_GOO = 'fixed inset-0 isolate z-50'

/** shadcn's DialogContent (`goo={false}`). */
export const DIALOG_CONTENT_SHADCN =
  'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'

/** Goo on: the goo paints the background (`--goop-color: var(--popover)`), ring and shadow
 *  (goop.css's drop-shadow on the surface); no CSS enter/exit. */
export const DIALOG_CONTENT_GOO =
  'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 text-sm text-popover-foreground [--goop-color:var(--popover)] outline-none sm:max-w-sm'

/** The corner close (X): a ghost icon button, like shadcn. */
export const DIALOG_CLOSE = 'absolute top-2 right-2'

export const DIALOG_HEADER = 'flex flex-col gap-2'
export const DIALOG_FOOTER = '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end'
export const DIALOG_TITLE = 'cn-font-heading text-base leading-none font-medium'
export const DIALOG_DESCRIPTION = 'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground'

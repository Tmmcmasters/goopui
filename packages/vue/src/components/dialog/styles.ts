// Class strings shared by GoopDialog and GoopAlertDialog (shadcn-vue's, with the `data-[state=]`
// variants reka 2.11 emits).

/** shadcn's DialogContent / AlertDialogContent (`:goo="false"`). */
export const DIALOG_CONTENT_SHADCN =
  'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg outline-hidden'

/** Goo on: the goo paints the background (`--goop-color`), border and shadow; no CSS enter/exit. */
export const DIALOG_CONTENT_GOO =
  'text-foreground [--goop-color:var(--background)] fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg p-6 sm:max-w-lg outline-hidden'

/** The corner close (X). Its opacity is scaled by the emerge content fade (1 without goo). */
export const DIALOG_CLOSE =
  "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-[calc(0.7*var(--goop-emerge-content,1))] transition-opacity hover:opacity-[var(--goop-emerge-content,1)] focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

export const DIALOG_HEADER = 'flex flex-col gap-2 text-center sm:text-left'
export const DIALOG_FOOTER = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'
export const DIALOG_TITLE = 'text-lg leading-none font-semibold'
export const DIALOG_DESCRIPTION = 'text-muted-foreground text-sm'

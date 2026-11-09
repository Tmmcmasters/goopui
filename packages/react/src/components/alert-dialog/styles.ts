// shadcn/ui's AlertDialog classes (React, style `radix-nova`; the same strings as the Vue
// adapter's dialog/styles.ts). `data-open:` / `data-closed:` are spelled out as the
// `data-[state=...]` Radix emits. `size` is `default` | `sm` on the content.

const ALERT_DIALOG_CONTENT_BASE =
  'group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 text-popover-foreground outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm'

/** shadcn's AlertDialogContent (`goo={false}`). */
export const ALERT_DIALOG_CONTENT_SHADCN = `${ALERT_DIALOG_CONTENT_BASE} bg-popover ring-1 ring-foreground/10 duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`

/** Goo on: the goo paints the background, ring and shadow. */
export const ALERT_DIALOG_CONTENT_GOO = `${ALERT_DIALOG_CONTENT_BASE} [--goop-color:var(--popover)]`

export const ALERT_DIALOG_HEADER =
  'grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]'
export const ALERT_DIALOG_FOOTER =
  '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end'
export const ALERT_DIALOG_MEDIA =
  "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6"
export const ALERT_DIALOG_TITLE =
  'cn-font-heading text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2'
export const ALERT_DIALOG_DESCRIPTION =
  'text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground'

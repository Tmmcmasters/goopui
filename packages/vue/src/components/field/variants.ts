// shadcn-vue's Field classes (style `reka-nova`), verbatim (shadcn/ui React radix-nova has the
// same set).
import { cva, type VariantProps } from 'class-variance-authority'

export const fieldVariants = cva('data-[invalid=true]:text-destructive gap-2 group/field flex w-full', {
  variants: {
    orientation: {
      vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
      horizontal:
        'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      responsive:
        'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
})

export type FieldVariants = VariantProps<typeof fieldVariants>

export const FIELD_SET = 'gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3 flex flex-col'
export const FIELD_LEGEND = 'mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base'
export const FIELD_GROUP =
  'gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4 group/field-group @container/field-group flex w-full flex-col'
export const FIELD_CONTENT = 'gap-0.5 group/field-content flex flex-1 flex-col leading-snug'
export const FIELD_LABEL = [
  'has-data-checked:bg-primary/5 has-data-checked:border-primary/30 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 gap-2 group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 group/field-label peer/field-label flex w-fit leading-snug',
  'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
] as const
export const FIELD_TITLE = 'gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50 flex w-fit items-center leading-snug'
export const FIELD_DESCRIPTION = [
  'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5 leading-normal font-normal group-has-data-horizontal/field:text-balance',
  'last:mt-0 nth-last-2:-mt-1',
  '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
] as const
export const FIELD_SEPARATOR = '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2 relative'
export const FIELD_SEPARATOR_LINE = 'absolute inset-0 top-1/2'
export const FIELD_SEPARATOR_CONTENT = 'text-muted-foreground px-2 relative mx-auto block w-fit bg-background'
export const FIELD_ERROR = 'text-destructive text-sm font-normal'
export const FIELD_ERROR_LIST = 'ml-4 flex list-disc flex-col gap-1'

/** One error: a message string or an object with one (vee-validate, react-hook-form, zod). */
export type FieldErrorItem = string | { message?: string | undefined } | undefined

/** shadcn's FieldError content: unique messages; one becomes a string, several a list. Pure. */
export function fieldErrorContent(errors: readonly FieldErrorItem[] | undefined): string | string[] | null {
  if (!errors || errors.length === 0) return null
  const unique = [
    ...new Map(
      errors
        .filter(Boolean)
        .map((error) => [typeof error === 'string' ? error : error?.message, error] as const),
    ).values(),
  ]
  const msg = (e: FieldErrorItem): string | undefined => (typeof e === 'string' ? e : e?.message)
  if (unique.length === 0) return null
  if (unique.length === 1) return msg(unique[0]) || null
  const list = unique.map(msg).filter((m): m is string => !!m)
  return list.length ? list : null
}

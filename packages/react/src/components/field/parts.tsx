// GoopField's plain parts: shadcn/ui's FieldSet, FieldLegend, FieldGroup, FieldContent,
// FieldLabel, FieldTitle, FieldDescription and FieldSeparator. No goo and no hooks, so this
// module has no 'use client' (like GoopEmpty's parts): they render in React Server Components
// as they are (GoopLabel and GoopSeparator are Radix, whose own modules are the client
// boundary).
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef, type ForwardRefExoticComponent, type ReactNode, type RefAttributes } from 'react'
import { GoopLabel, type GoopLabelProps } from '../label/GoopLabel'
import { GoopSeparator } from '../separator/GoopSeparator'
import {
  FIELD_CONTENT,
  FIELD_DESCRIPTION,
  FIELD_GROUP,
  FIELD_LABEL,
  FIELD_LEGEND,
  FIELD_SEPARATOR,
  FIELD_SEPARATOR_CONTENT,
  FIELD_SEPARATOR_LINE,
  FIELD_SET,
  FIELD_TITLE,
} from './variants'

type DivProps = ComponentPropsWithoutRef<'div'>

export type GoopFieldSetProps = ComponentPropsWithoutRef<'fieldset'>
export const GoopFieldSet = forwardRef<HTMLFieldSetElement, GoopFieldSetProps>(function GoopFieldSet({ className, ...props }, ref) {
  return <fieldset ref={ref} data-slot="field-set" className={cn(FIELD_SET, className)} {...props} />
})
GoopFieldSet.displayName = 'GoopFieldSet'

export type GoopFieldLegendProps = ComponentPropsWithoutRef<'legend'> & { variant?: 'legend' | 'label' }
export const GoopFieldLegend = forwardRef<HTMLLegendElement, GoopFieldLegendProps>(function GoopFieldLegend({ className, variant = 'legend', ...props }, ref) {
  return <legend ref={ref} data-slot="field-legend" data-variant={variant} className={cn(FIELD_LEGEND, className)} {...props} />
})
GoopFieldLegend.displayName = 'GoopFieldLegend'

function part(slot: string, base: string, name: string) {
  const C = forwardRef<HTMLDivElement, DivProps>(function FieldPart({ className, ...props }, ref) {
    return <div ref={ref} data-slot={slot} className={cn(base, className)} {...props} />
  })
  C.displayName = name
  return C
}

export type GoopFieldGroupProps = DivProps
export type GoopFieldContentProps = DivProps
export type GoopFieldTitleProps = DivProps
export const GoopFieldGroup = part('field-group', FIELD_GROUP, 'GoopFieldGroup')
export const GoopFieldContent = part('field-content', FIELD_CONTENT, 'GoopFieldContent')
export const GoopFieldTitle = part('field-label', FIELD_TITLE, 'GoopFieldTitle')

export type GoopFieldLabelProps = GoopLabelProps
export const GoopFieldLabel: ForwardRefExoticComponent<GoopFieldLabelProps & RefAttributes<HTMLLabelElement>> = forwardRef<HTMLLabelElement, GoopFieldLabelProps>(function GoopFieldLabel({ className, ...props }, ref) {
  return <GoopLabel ref={ref} data-slot="field-label" className={cn(...FIELD_LABEL, className)} {...props} />
})
GoopFieldLabel.displayName = 'GoopFieldLabel'

export type GoopFieldDescriptionProps = ComponentPropsWithoutRef<'p'>
export const GoopFieldDescription = forwardRef<HTMLParagraphElement, GoopFieldDescriptionProps>(function GoopFieldDescription({ className, ...props }, ref) {
  return <p ref={ref} data-slot="field-description" className={cn(...FIELD_DESCRIPTION, className)} {...props} />
})
GoopFieldDescription.displayName = 'GoopFieldDescription'

export type GoopFieldSeparatorProps = DivProps & { children?: ReactNode }
export const GoopFieldSeparator = forwardRef<HTMLDivElement, GoopFieldSeparatorProps>(function GoopFieldSeparator({ children, className, ...props }, ref) {
  return (
    <div ref={ref} data-slot="field-separator" data-content={!!children} className={cn(FIELD_SEPARATOR, className)} {...props}>
      <GoopSeparator className={FIELD_SEPARATOR_LINE} />
      {children ? (
        <span className={FIELD_SEPARATOR_CONTENT} data-slot="field-separator-content">
          {children}
        </span>
      ) : null}
    </div>
  )
})
GoopFieldSeparator.displayName = 'GoopFieldSeparator'

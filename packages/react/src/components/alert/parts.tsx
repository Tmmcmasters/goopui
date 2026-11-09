// GoopAlert's parts: shadcn/ui's AlertTitle, AlertDescription and AlertAction. Plain markup
// with no goo and no hooks, so this module has no 'use client': the parts render in React
// Server Components as they are.
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { ALERT_ACTION, ALERT_DESCRIPTION, ALERT_TITLE } from './variants'

type DivProps = ComponentPropsWithoutRef<'div'>

function part(slot: string, base: string, name: string) {
  const C = forwardRef<HTMLDivElement, DivProps>(function AlertPart({ className, ...props }, ref) {
    return <div ref={ref} data-slot={slot} className={cn(base, className)} {...props} />
  })
  C.displayName = name
  return C
}

export type GoopAlertTitleProps = DivProps
export type GoopAlertDescriptionProps = DivProps
export type GoopAlertActionProps = DivProps

export const GoopAlertTitle = part('alert-title', ALERT_TITLE, 'GoopAlertTitle')
export const GoopAlertDescription = part('alert-description', ALERT_DESCRIPTION, 'GoopAlertDescription')
export const GoopAlertAction = part('alert-action', ALERT_ACTION, 'GoopAlertAction')

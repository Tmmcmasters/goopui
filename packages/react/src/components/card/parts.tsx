// GoopCard's parts: shadcn/ui's CardHeader, CardTitle, CardDescription, CardAction,
// CardContent and CardFooter. Plain markup with no goo and no hooks, so this module has no
// 'use client': the parts render in React Server Components as they are.
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { CARD_ACTION, CARD_CONTENT, CARD_DESCRIPTION, CARD_FOOTER, CARD_HEADER, CARD_TITLE } from './styles'

type DivProps = ComponentPropsWithoutRef<'div'>

function part(slot: string, base: string, name: string) {
  const C = forwardRef<HTMLDivElement, DivProps>(function CardPart({ className, ...props }, ref) {
    return <div ref={ref} data-slot={slot} className={cn(base, className)} {...props} />
  })
  C.displayName = name
  return C
}

export type GoopCardHeaderProps = DivProps
export type GoopCardTitleProps = DivProps
export type GoopCardDescriptionProps = DivProps
export type GoopCardActionProps = DivProps
export type GoopCardContentProps = DivProps
export type GoopCardFooterProps = DivProps

export const GoopCardHeader = part('card-header', CARD_HEADER, 'GoopCardHeader')
export const GoopCardTitle = part('card-title', CARD_TITLE, 'GoopCardTitle')
export const GoopCardDescription = part('card-description', CARD_DESCRIPTION, 'GoopCardDescription')
export const GoopCardAction = part('card-action', CARD_ACTION, 'GoopCardAction')
export const GoopCardContent = part('card-content', CARD_CONTENT, 'GoopCardContent')
export const GoopCardFooter = part('card-footer', CARD_FOOTER, 'GoopCardFooter')

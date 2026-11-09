// shadcn/ui's Item parts (ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions,
// ItemHeader, ItemFooter, ItemSeparator), `className` merge. Plain: no goo and no hooks, so no
// 'use client' (they render in React Server Components as they are).
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'
import { GoopSeparator, type GoopSeparatorProps } from '../separator'
import { ITEM_ACTIONS, ITEM_CONTENT, ITEM_DESCRIPTION, ITEM_FOOTER, ITEM_HEADER, ITEM_SEPARATOR, ITEM_TITLE, itemMediaVariants, type ItemMediaVariant } from './styles'

export type GoopItemMediaProps = ComponentPropsWithoutRef<'div'> & { variant?: ItemMediaVariant | null }

export const GoopItemMedia = forwardRef<HTMLDivElement, GoopItemMediaProps>(function GoopItemMedia({ className, variant = 'default', ...props }, ref) {
  return <div ref={ref} data-slot="item-media" data-variant={variant ?? 'default'} className={cn(itemMediaVariants({ variant }), className)} {...props} />
})
GoopItemMedia.displayName = 'GoopItemMedia'

export type GoopItemContentProps = ComponentPropsWithoutRef<'div'>

export const GoopItemContent = forwardRef<HTMLDivElement, GoopItemContentProps>(function GoopItemContent({ className, ...props }, ref) {
  return <div ref={ref} data-slot="item-content" className={cn(ITEM_CONTENT, className)} {...props} />
})
GoopItemContent.displayName = 'GoopItemContent'

export type GoopItemTitleProps = ComponentPropsWithoutRef<'div'>

export const GoopItemTitle = forwardRef<HTMLDivElement, GoopItemTitleProps>(function GoopItemTitle({ className, ...props }, ref) {
  return <div ref={ref} data-slot="item-title" className={cn(ITEM_TITLE, className)} {...props} />
})
GoopItemTitle.displayName = 'GoopItemTitle'

export type GoopItemDescriptionProps = ComponentPropsWithoutRef<'p'>

export const GoopItemDescription = forwardRef<HTMLParagraphElement, GoopItemDescriptionProps>(function GoopItemDescription({ className, ...props }, ref) {
  return <p ref={ref} data-slot="item-description" className={cn(ITEM_DESCRIPTION, className)} {...props} />
})
GoopItemDescription.displayName = 'GoopItemDescription'

export type GoopItemActionsProps = ComponentPropsWithoutRef<'div'>

export const GoopItemActions = forwardRef<HTMLDivElement, GoopItemActionsProps>(function GoopItemActions({ className, ...props }, ref) {
  return <div ref={ref} data-slot="item-actions" className={cn(ITEM_ACTIONS, className)} {...props} />
})
GoopItemActions.displayName = 'GoopItemActions'

export type GoopItemHeaderProps = ComponentPropsWithoutRef<'div'>

export const GoopItemHeader = forwardRef<HTMLDivElement, GoopItemHeaderProps>(function GoopItemHeader({ className, ...props }, ref) {
  return <div ref={ref} data-slot="item-header" className={cn(ITEM_HEADER, className)} {...props} />
})
GoopItemHeader.displayName = 'GoopItemHeader'

export type GoopItemFooterProps = ComponentPropsWithoutRef<'div'>

export const GoopItemFooter = forwardRef<HTMLDivElement, GoopItemFooterProps>(function GoopItemFooter({ className, ...props }, ref) {
  return <div ref={ref} data-slot="item-footer" className={cn(ITEM_FOOTER, className)} {...props} />
})
GoopItemFooter.displayName = 'GoopItemFooter'

export type GoopItemSeparatorProps = GoopSeparatorProps

export const GoopItemSeparator: ForwardRefExoticComponent<GoopItemSeparatorProps & RefAttributes<HTMLDivElement>> = forwardRef<HTMLDivElement, GoopItemSeparatorProps>(function GoopItemSeparator({ className, ...props }, ref) {
  return <GoopSeparator ref={ref} data-slot="item-separator" orientation="horizontal" className={cn(ITEM_SEPARATOR, className)} {...props} />
})
GoopItemSeparator.displayName = 'GoopItemSeparator'

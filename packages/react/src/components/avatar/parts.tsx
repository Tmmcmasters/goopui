// GoopAvatar's parts: shadcn/ui's AvatarImage, AvatarFallback (Radix Avatar; the parent
// GoopAvatar's settle plays when either appears), AvatarBadge, AvatarGroup and
// AvatarGroupCount. No goo and no hooks here, so no 'use client': Radix's own module is the
// client boundary, and these render in React Server Components as they are.
import { cn } from 'cn'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { AVATAR_BADGE, AVATAR_FALLBACK, AVATAR_GROUP, AVATAR_GROUP_COUNT, AVATAR_IMAGE, goopAvatarImageRound } from './styles'

export type GoopAvatarImageProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
export const GoopAvatarImage = forwardRef<HTMLImageElement, GoopAvatarImageProps>(function GoopAvatarImage({ className, ...props }, ref) {
  return <AvatarPrimitive.Image ref={ref} data-slot="avatar-image" className={cn(AVATAR_IMAGE, goopAvatarImageRound, className)} {...props} />
})
GoopAvatarImage.displayName = 'GoopAvatarImage'

export type GoopAvatarFallbackProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
export const GoopAvatarFallback = forwardRef<HTMLSpanElement, GoopAvatarFallbackProps>(function GoopAvatarFallback({ className, ...props }, ref) {
  return <AvatarPrimitive.Fallback ref={ref} data-slot="avatar-fallback" className={cn(AVATAR_FALLBACK, className)} {...props} />
})
GoopAvatarFallback.displayName = 'GoopAvatarFallback'

export type GoopAvatarBadgeProps = ComponentPropsWithoutRef<'span'>
export const GoopAvatarBadge = forwardRef<HTMLSpanElement, GoopAvatarBadgeProps>(function GoopAvatarBadge({ className, ...props }, ref) {
  return <span ref={ref} data-slot="avatar-badge" className={cn(AVATAR_BADGE, className)} {...props} />
})
GoopAvatarBadge.displayName = 'GoopAvatarBadge'

export type GoopAvatarGroupProps = ComponentPropsWithoutRef<'div'>
export const GoopAvatarGroup = forwardRef<HTMLDivElement, GoopAvatarGroupProps>(function GoopAvatarGroup({ className, ...props }, ref) {
  return <div ref={ref} data-slot="avatar-group" className={cn(AVATAR_GROUP, className)} {...props} />
})
GoopAvatarGroup.displayName = 'GoopAvatarGroup'

export type GoopAvatarGroupCountProps = ComponentPropsWithoutRef<'div'>
export const GoopAvatarGroupCount = forwardRef<HTMLDivElement, GoopAvatarGroupCountProps>(function GoopAvatarGroupCount({ className, ...props }, ref) {
  return <div ref={ref} data-slot="avatar-group-count" className={cn(AVATAR_GROUP_COUNT, className)} {...props} />
})
GoopAvatarGroupCount.displayName = 'GoopAvatarGroupCount'

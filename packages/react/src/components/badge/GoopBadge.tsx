'use client'
// GoopBadge: shadcn/ui's Badge (same cva variants, `className` merge, `asChild` via Radix
// Slot). An interactive badge (a link or button) swells ~1px on hover with a soft gooey
// overshoot; a plain badge stays static. CSS only, so the server renders it exactly as the
// client does. `swell={false}` turns it off. Client module only because it reads
// <GoopProvider>'s preset (React context).
import { badgeStyle, badgeSwellOn } from '@goopui/core'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react'
import { useGoopConfig } from '../../config'
import { BADGE_PROP_KEYS, splitProps, toBadgeOptions, type GoopBadgeEngineProps } from '../../goop-props'
import { badgeVariants, goopBadgeFill, goopBadgeSwell, type BadgeVariant } from './variants'

export type GoopBadgeProps = Omit<ComponentPropsWithoutRef<'span'>, keyof GoopBadgeEngineProps> &
  GoopBadgeEngineProps & {
    variant?: BadgeVariant | null
    /** Render the single child instead, merging classes and props onto it (Radix Slot). */
    asChild?: boolean
  }

export const GoopBadge = forwardRef<HTMLSpanElement, GoopBadgeProps>(function GoopBadge(allProps, ref) {
  const [engine, props] = splitProps(allProps, BADGE_PROP_KEYS)
  const { className, variant = 'default', asChild = false, style, ...rest } = props
  const options = toBadgeOptions(engine, useGoopConfig())
  const on = badgeSwellOn(options)
  const Comp = asChild ? Slot.Root : 'span'
  return (
    <Comp
      ref={ref}
      data-slot="badge"
      data-variant={variant}
      data-goop-swell={on ? '' : undefined}
      data-goop-still={on && options.reducedMotion === true ? '' : undefined}
      style={{ ...(badgeStyle(options) as CSSProperties), ...style }}
      className={cn(badgeVariants({ variant }), on && goopBadgeFill[variant ?? 'default'], on && goopBadgeSwell, className)}
      {...rest}
    />
  )
})
GoopBadge.displayName = 'GoopBadge'

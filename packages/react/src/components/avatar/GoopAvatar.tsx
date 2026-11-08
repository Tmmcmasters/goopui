'use client'
// GoopAvatar: shadcn/ui's Avatar (Radix Avatar Root, `size`, `className` merge). When the
// image loads (or the fallback appears) it plops in with a small gooey settle: a scale-in with
// a soft overshoot. CSS only (goop.css), once per appearance, so the server renders it exactly
// as the client does. Reduced motion: static. `settle={false}` is shadcn's Avatar. Client
// module because it reads <GoopProvider>'s preset (React context). The other parts are
// server-safe (./parts).
import { avatarSettleOn, avatarStyle } from '@goopui/core'
import { cn } from 'cn'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react'
import { useGoopConfig } from '../../config'
import { AVATAR_PROP_KEYS, splitProps, toAvatarOptions, type GoopAvatarEngineProps } from '../../goop-props'
import { AVATAR, goopAvatarSettle } from './styles'

export type GoopAvatarProps = Omit<ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, keyof GoopAvatarEngineProps> &
  GoopAvatarEngineProps & {
    /** Same as shadcn. */
    size?: 'default' | 'sm' | 'lg'
  }

export const GoopAvatar = forwardRef<HTMLSpanElement, GoopAvatarProps>(function GoopAvatar(allProps, ref) {
  const [engine, props] = splitProps(allProps, AVATAR_PROP_KEYS)
  const { className, size = 'default', style, ...rest } = props
  const options = toAvatarOptions(engine, useGoopConfig())
  const on = avatarSettleOn(options)
  return (
    <AvatarPrimitive.Root
      ref={ref}
      data-slot="avatar"
      data-size={size}
      data-goop-settle={on ? '' : undefined}
      data-goop-still={on && options.reducedMotion === true ? '' : undefined}
      style={{ ...(avatarStyle(options) as CSSProperties), ...style }}
      className={cn(AVATAR, on && goopAvatarSettle, className)}
      {...rest}
    />
  )
})
GoopAvatar.displayName = 'GoopAvatar'

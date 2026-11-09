'use client'
// GoopKbd: shadcn/ui's Kbd (a <kbd>, `className` merge). Clicking it, or pressing the keys in
// `keys` (opt-in, e.g. ['Meta', 'K']), squishes it into its base like a soft key; it springs
// back with a small jelly rebound when released (core `attachKbd` after hydration, a
// transform: no layout shift). With the squish on it takes pointer events (shadcn's Kbd is
// pointer-events-none). Before mount, during SSR, with `goo={false}` or under reduced motion
// it is a plain shadcn Kbd. GoopKbdGroup is server-safe (./parts).
import { attachKbd, type KbdHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { KBD_PROP_KEYS, splitProps, toKbdOptions, type GoopKbdEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import { KBD, goopKbdPressable } from './styles'

export type GoopKbdProps = Omit<ComponentPropsWithoutRef<'kbd'>, keyof GoopKbdEngineProps> &
  GoopKbdEngineProps & {
    /** Receives the live squish handle (`tap()`; null before mount / when off). */
    goopRef?: Ref<KbdHandle>
  }

export const GoopKbd = forwardRef<HTMLElement, GoopKbdProps>(function GoopKbd(allProps, ref) {
  const [engine, props] = splitProps(allProps, KBD_PROP_KEYS)
  const { className, goopRef, ...rest } = props
  const el = useRef<HTMLElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const options = useStableValue(toKbdOptions(engine, useGoopConfig()))
  const handle = useAttached(el, attachKbd, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as KbdHandle, [handle])
  return <kbd ref={composed} data-slot="kbd" className={cn(KBD, options && goopKbdPressable, className)} {...rest} />
})
GoopKbd.displayName = 'GoopKbd'

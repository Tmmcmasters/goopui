'use client'
// GoopAlert: shadcn/ui's Alert (a div with role="alert", same cva variants, `className`
// merge). When it mounts or appears (first on screen, or shown again after being hidden) core's
// `attachAlert` (after hydration) plays a soft goo entrance: the body blooms out of its top
// edge in a low, wide mound, overshoots a couple of px and settles (`bloom`); the icon gets one
// gentle jelly wobble (`wobble`). Nothing loops. The alert's box never moves (no layout
// shift). Before mount, during SSR, with `goo={false}` or under reduced motion it is a plain
// shadcn Alert. The parts (GoopAlertTitle, ...) are server-safe (./parts).
import { attachAlert, type AlertHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { ALERT_PROP_KEYS, splitProps, toAlertOptions, type GoopAlertEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import { alertVariants, type AlertVariants } from './variants'

export type GoopAlertProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopAlertEngineProps> &
  GoopAlertEngineProps &
  AlertVariants & {
    /** Receives the live entrance handle (`replay()`; null before mount / when goo is off). */
    goopRef?: Ref<AlertHandle>
  }

export const GoopAlert = forwardRef<HTMLDivElement, GoopAlertProps>(function GoopAlert(allProps, ref) {
  const [engine, props] = splitProps(allProps, ALERT_PROP_KEYS)
  const { className, variant, goopRef, ...rest } = props
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const options = useStableValue(toAlertOptions(engine, useGoopConfig()))
  const handle = useAttached(el, attachAlert, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as AlertHandle, [handle])
  return (
    <div
      ref={composed}
      data-slot="alert"
      data-goop-host={engine.goo !== false ? 'alert' : undefined}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...rest}
    />
  )
})
GoopAlert.displayName = 'GoopAlert'

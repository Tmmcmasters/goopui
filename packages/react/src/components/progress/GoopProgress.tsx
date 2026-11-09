'use client'
// GoopProgress: shadcn/ui's Progress (Radix Progress Root / Indicator, `value`, `max`,
// `className` merge, same classes) that fills like liquid. After mount core's `attachProgress`
// adds one aria-hidden goo layer to the root: a liquid fill with a rounded, wobbling goo front,
// a sloshing surface and the odd drip. `value={null}` is indeterminate: a goo slug runs along
// the bar with GoopSpinner's surge. The real indicator stays (see-through) and Radix keeps
// role="progressbar" and the aria values (unlike shadcn/ui, `value` also reaches Radix, so
// aria-valuenow is set, as in @goopui/vue). Before mount, during SSR, or with `goo={false}` it
// is a plain shadcn Progress.
import { attachProgress, type ProgressHandle } from '@goopui/core'
import { cn } from 'cn'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { PROGRESS_PROP_KEYS, splitProps, toProgressOptions, type GoopProgressEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { progressIndicatorClass, progressRootClass } from './variants'

export type GoopProgressProps = Omit<ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, keyof GoopProgressEngineProps> &
  GoopProgressEngineProps & {
    /** Master switch. `false` renders a plain shadcn Progress. */
    goo?: boolean
    /** Receives the live progress handle (null before mount / when goo is off). */
    goopRef?: Ref<ProgressHandle>
  }

export const GoopProgress = forwardRef<HTMLDivElement, GoopProgressProps>(function GoopProgress(allProps, ref) {
  const [engine, props] = splitProps(allProps, PROGRESS_PROP_KEYS)
  const { className, goo = true, goopRef, value, max, ...rest } = props

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  // Absent is an empty bar (shadcn draws `value || 0`); null is indeterminate.
  const options = { ...toProgressOptions(engine, config), value: value === undefined ? 0 : value, max: max ?? 100 }
  const handle = useAttached(el, attachProgress, options, goo)
  useImperativeHandle(goopRef, () => handle as ProgressHandle, [handle])
  const active = handle !== null

  return (
    <ProgressPrimitive.Root
      ref={composed}
      data-slot="progress"
      data-goop-host={goo ? 'progress' : undefined}
      data-goop-active={active ? '' : undefined}
      value={value}
      max={max}
      className={cn(progressRootClass, className)}
      {...rest}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={progressIndicatorClass}
        style={{ transform: `translateX(-${100 - (value || 0)}%)`, ...(active ? { backgroundColor: 'transparent' } : {}) }}
      />
    </ProgressPrimitive.Root>
  )
})
GoopProgress.displayName = 'GoopProgress'

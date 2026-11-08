'use client'
// GoopSpinner: shadcn/ui's Spinner (role="status", aria-label="Loading", `className` merge,
// size via classes like `size-6`) drawn in goo: by default an orbit of blobs that merge and
// split, or one of the other `variant` shapes. Same engine and options as @goopui/vue's.
//
// During SSR, hydration and before the layout effect it renders a static inline SVG of the
// merged reduced-motion pose (its own tiny goo filter, scaled with the viewBox), so first paint
// and hydration match. Then core's `attachSpinner` takes over: a goo renderer layer driven by a
// ticker on the shared rAF loop, paused offscreen / under reduced motion. Color is
// currentColor, like the lucide icon. It is playful by default (`interactive`): pointer moves
// slosh it, press-and-drag pulls it out in lumps, click/tap pops it. `interactive={false}`
// turns all three off (and makes it pointer-events: none); `slosh` / `grab` / `pop` each.
import { attachSpinner, gooColorMatrix, SPINNER_FEEL, spinnerGooParams, spinnerStaticPose, type SpinnerHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useId, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type CSSProperties, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { SPINNER_PROP_KEYS, splitProps, toSpinnerOptions, type GoopSpinnerEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'

export type GoopSpinnerProps = Omit<ComponentPropsWithoutRef<'span'>, keyof GoopSpinnerEngineProps> &
  GoopSpinnerEngineProps & {
    /** Receives the live spinner handle (null before mount). */
    goopRef?: Ref<SpinnerHandle>
  }

const VIEW = 24
const fmt = (n: number): string => String(Math.round(n * 1000) / 1000)

export const GoopSpinner = forwardRef<HTMLSpanElement, GoopSpinnerProps>(function GoopSpinner(allProps, ref) {
  const [engine, props] = splitProps(allProps, SPINNER_PROP_KEYS)
  const { className, style, goopRef, ...rest } = props
  const config = useGoopConfig()
  const options = toSpinnerOptions(engine, config)

  const el = useRef<HTMLSpanElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useAttached(el, attachSpinner, options)
  useImperativeHandle(goopRef, () => handle as SpinnerHandle, [handle])
  const active = handle !== null

  // Static fallback (SSR / pre-mount): pure math, no DOM.
  const id = useId()
  const filterId = `goop-spinner-${id.replace(/[^\w-]/g, '')}`
  const feel = SPINNER_FEEL[options.preset ?? 'playful']
  const goo = spinnerGooParams(VIEW, feel)
  const circles = active
    ? []
    : spinnerStaticPose(options.blobs!, feel, options.variant)
        .filter((c) => c.r > 0)
        .map((c) => ({ cx: fmt(c.x * VIEW), cy: fmt(c.y * VIEW), r: fmt(c.r * VIEW) }))

  return (
    <span
      ref={composed}
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      data-variant={options.variant}
      data-goop-active={active ? '' : undefined}
      className={cn('relative inline-block size-4 shrink-0', !options.interactive && 'pointer-events-none', className)}
      style={{ '--goop-color': 'currentColor', ...style } as CSSProperties}
      {...rest}
    >
      {active ? null : (
        <svg aria-hidden="true" viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`} className="block size-full overflow-visible" fill="currentColor">
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={goo.blur} result="b" />
            <feColorMatrix in="b" type="matrix" values={gooColorMatrix(goo)} result="g" />
            <feComposite in="SourceGraphic" in2="g" operator="atop" />
          </filter>
          <g filter={`url(#${filterId})`}>
            {circles.map((c, i) => (
              <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
            ))}
          </g>
        </svg>
      )}
    </span>
  )
})
GoopSpinner.displayName = 'GoopSpinner'

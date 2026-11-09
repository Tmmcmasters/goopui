'use client'
// GoopSlider: shadcn/ui's Slider (Radix Slider Root / Track / Range / Thumb, `value` /
// `defaultValue` / `onValueChange` / `onValueCommit` of a number[], orientation, range sliders
// with several thumbs, `className` merge, same classes) whose thumbs are goo blobs and whose
// range is liquid. After mount core's `attachSlider` adds one aria-hidden goo layer to the
// root; it measures the real (now see-through) range and thumbs, so Radix keeps all behaviour:
// drag, keyboard, aria, inverted, rtl. Before mount, during SSR, or with `goo={false}` it is a
// plain shadcn Slider, so hydration matches.
import { attachSlider, type SliderHandle } from '@goopui/core'
import { cn } from 'cn'
import { Slider as SliderPrimitive } from 'radix-ui'
import { forwardRef, useImperativeHandle, useMemo, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { SLIDER_PROP_KEYS, splitProps, toSliderOptions, type GoopSliderEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useIsomorphicLayoutEffect } from '../../utils'
import { goopSliderRangeStyle, goopSliderThumbStyle, sliderRangeClass, sliderRootClass, sliderThumbClass, sliderTrackClass } from './variants'

export type GoopSliderProps = Omit<ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, keyof GoopSliderEngineProps> &
  GoopSliderEngineProps & {
    /** Master switch. `false` renders a plain shadcn Slider. */
    goo?: boolean
    /** Receives the live slider handle (null before mount / when goo is off). */
    goopRef?: Ref<SliderHandle>
  }

export const GoopSlider = forwardRef<HTMLSpanElement, GoopSliderProps>(function GoopSlider(allProps, ref) {
  const [engine, props] = splitProps(allProps, SLIDER_PROP_KEYS)
  const { className, goo = true, goopRef, defaultValue, value, min = 0, max = 100, orientation, ...rest } = props

  // One thumb per value, as in shadcn/ui (no value at all: a range from min to max).
  const values = useMemo(() => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]), [value, defaultValue, min, max])

  const el = useRef<HTMLSpanElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const vertical = orientation === 'vertical'
  const handle = useAttached(el, attachSlider, { ...toSliderOptions(engine, config), orientation: vertical ? 'vertical' : 'horizontal' }, goo)
  useImperativeHandle(goopRef, () => handle as SliderHandle, [handle])
  const active = handle !== null
  // The thumb is the focusable role="slider": a one-thumb slider's label goes on it too (Radix
  // names only range thumbs, "Minimum" / "Maximum").
  const thumbName = values.length === 1 ? { 'aria-label': rest['aria-label'], 'aria-labelledby': rest['aria-labelledby'] } : {}

  // Core also watches the parts' inline styles; this covers controlled changes it might miss.
  const key = value?.join(',')
  useIsomorphicLayoutEffect(() => {
    handle?.measure()
  }, [handle, key])

  return (
    <SliderPrimitive.Root
      ref={composed}
      data-slot="slider"
      data-goop-host={goo ? 'slider' : undefined}
      data-goop-active={active ? '' : undefined}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      orientation={orientation}
      className={cn(sliderRootClass, className)}
      {...rest}
    >
      <SliderPrimitive.Track data-slot="slider-track" className={sliderTrackClass}>
        <SliderPrimitive.Range data-slot="slider-range" className={sliderRangeClass} style={active ? goopSliderRangeStyle : undefined} />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb key={index} data-slot="slider-thumb" {...thumbName} className={sliderThumbClass} style={active ? goopSliderThumbStyle : undefined} />
      ))}
    </SliderPrimitive.Root>
  )
})
GoopSlider.displayName = 'GoopSlider'

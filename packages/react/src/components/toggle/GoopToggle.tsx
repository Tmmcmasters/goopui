'use client'
// GoopToggle: shadcn/ui's Toggle (Radix Toggle, `pressed` / `defaultPressed` /
// `onPressedChange`, variants default | outline, sizes, `className` merge, `asChild`) whose
// pressed background is goo. After mount core's `attachToggle` adds one aria-hidden goo layer
// inside the button: pressing floods it from the press point, un-pressing drains it back there.
// Before mount, during SSR, or with `goo={false}` it is a plain shadcn Toggle, so hydration
// matches.
import { attachToggle, type ToggleHandle } from '@goopui/core'
import { cn } from 'cn'
import { Toggle as TogglePrimitive } from 'radix-ui'
import { forwardRef, useImperativeHandle, useRef, useState, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { TOGGLE_PROP_KEYS, splitProps, toToggleOptions, type GoopSoundProps, type GoopToggleEngineProps } from '../../goop-props'
import { useGoopCue } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { goopToggleColors, goopToggleFilled, toggleVariants, type ToggleVariants } from './variants'

export type GoopToggleProps = Omit<ComponentPropsWithoutRef<typeof TogglePrimitive.Root>, keyof GoopToggleEngineProps> &
  GoopToggleEngineProps &
  GoopSoundProps &
  ToggleVariants & {
    /** Master switch. `false` renders a plain shadcn Toggle. */
    goo?: boolean
    /** Receives the live toggle handle (null before mount / when goo is off). */
    goopRef?: Ref<ToggleHandle>
  }

export const GoopToggle = forwardRef<HTMLButtonElement, GoopToggleProps>(function GoopToggle(allProps, ref) {
  const [engine, props] = splitProps(allProps, TOGGLE_PROP_KEYS)
  const { className, variant, size, goo = true, sound, goopRef, pressed: pressedProp, defaultPressed, onPressedChange, ...rest } = props

  // Controlled (`pressed`) or not (`defaultPressed`); core needs the state either way.
  const [inner, setInner] = useState(!!defaultPressed)
  const controlled = pressedProp !== undefined
  const pressed = controlled ? pressedProp : inner
  const onChange = (v: boolean): void => {
    if (!controlled) setInner(v)
    onPressedChange?.(v)
  }

  const el = useRef<HTMLButtonElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const cue = useGoopCue('toggle', { sound })
  const handle = useAttached(el, attachToggle, { ...toToggleOptions(engine, config), pressed }, goo)
  useImperativeHandle(goopRef, () => handle as ToggleHandle, [handle])
  const active = handle !== null

  return (
    <TogglePrimitive.Root
      ref={composed}
      data-slot="toggle"
      data-goop-host={goo ? 'toggle' : undefined}
      data-goop-active={active ? '' : undefined}
      pressed={pressed}
      onPressedChange={onChange}
      className={cn(toggleVariants({ variant, size }), goo && goopToggleColors, active && goopToggleFilled, className)}
      {...cue}
      {...rest}
    />
  )
})
GoopToggle.displayName = 'GoopToggle'

'use client'
// GoopInput: shadcn/ui's Input (a plain <input>, `className` merge, same classes,
// aria-invalid) with a goo focus ring. Focus flows goo around the border from the click point
// (or the left edge on keyboard focus) into a wobbly ring; typing ripples it near the caret;
// blur drains it. aria-invalid turns it destructive with a small drip. Core's `attachInput`
// draws it on an aria-hidden layer in a wrapper (`data-slot="input-goo"`, an <input> can't
// hold children); the real input stays on top, unfiltered, and gets every prop and the `ref`.
// The wrapper is in the server markup too, so hydration matches; the goo attaches after it.
// With `goo={false}` it is a plain shadcn Input (no wrapper).
import { attachInput, type InputHandle, type InputOptions } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref, type RefObject } from 'react'
import { useGoopConfig } from '../../config'
import { INPUT_PROP_KEYS, splitProps, toInputOptions, type GoopInputEngineProps, type GoopSoundProps } from '../../goop-props'
import { useGoopCue } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { goopFieldActive, goopFieldContainer, inputVariants } from './variants'

/** Props shared by GoopInput and GoopTextarea (besides the element's own). */
export type GoopFieldProps = GoopInputEngineProps &
  GoopSoundProps & {
    /** Classes for the wrapper that holds the goo layer (default `relative w-full min-w-0`). */
    containerClassName?: string
    /** Master switch. `false` renders the plain shadcn field (no wrapper). */
    goo?: boolean
    /** Receives the live goo handle (null before mount / when goo is off). */
    goopRef?: Ref<InputHandle>
  }

export type GoopInputProps = Omit<ComponentPropsWithoutRef<'input'>, keyof GoopFieldProps> & GoopFieldProps

/** Attach core's goo ring to `host` around `field` after mount (shared with GoopTextarea). */
export function useFieldGoo(
  host: RefObject<HTMLDivElement | null>,
  field: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  options: InputOptions,
  enabled: boolean,
): InputHandle | null {
  const attach = (el: HTMLElement, o: InputOptions): InputHandle => attachInput(el, field.current!, o)
  return useAttached(host, attach, options, enabled)
}

export const GoopInput = forwardRef<HTMLInputElement, GoopInputProps>(function GoopInput(allProps, ref) {
  const [engine, props] = splitProps(allProps, INPUT_PROP_KEYS)
  const { className, containerClassName, goo = true, sound, goopRef, type, ...rest } = props

  const host = useRef<HTMLDivElement | null>(null)
  const field = useRef<HTMLInputElement | null>(null)
  const composed = useComposedRefs(ref, field)
  const config = useGoopConfig()
  const cue = useGoopCue('input', { sound })
  const handle = useFieldGoo(host, field, toInputOptions(engine, config), goo)
  useImperativeHandle(goopRef, () => handle as InputHandle, [handle])
  const active = handle !== null

  const input = (
    <input ref={composed} type={type} data-slot="input" className={cn(inputVariants(), active && goopFieldActive, className)} {...cue} {...rest} />
  )
  if (!goo) return input
  return (
    <div
      ref={host}
      data-slot="input-goo"
      data-goop-host="input"
      data-goop-active={active ? '' : undefined}
      className={cn(goopFieldContainer, containerClassName)}
    >
      {input}
    </div>
  )
})
GoopInput.displayName = 'GoopInput'

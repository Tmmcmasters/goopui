'use client'
// GoopTextarea: shadcn/ui's Textarea (a plain <textarea>, `className` merge, same classes,
// aria-invalid) with the same goo focus ring as GoopInput (core `attachInput`). The ring
// follows the textarea as it grows (field-sizing-content); typing ripples the edge nearest the
// caret's line. `ref` is the <textarea>. With `goo={false}` it is a plain shadcn Textarea.
import type { InputHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef } from 'react'
import { useGoopConfig } from '../../config'
import { INPUT_PROP_KEYS, splitProps, toInputOptions } from '../../goop-props'
import { useGoopCue } from '../../sound'
import { useComposedRefs } from '../../utils'
import { useFieldGoo, type GoopFieldProps } from '../input/GoopInput'
import { goopFieldActive, goopFieldContainer, textareaVariants } from '../input/variants'

export type GoopTextareaProps = Omit<ComponentPropsWithoutRef<'textarea'>, keyof GoopFieldProps> & GoopFieldProps

export const GoopTextarea = forwardRef<HTMLTextAreaElement, GoopTextareaProps>(function GoopTextarea(allProps, ref) {
  const [engine, props] = splitProps(allProps, INPUT_PROP_KEYS)
  const { className, containerClassName, goo = true, sound, goopRef, ...rest } = props

  const host = useRef<HTMLDivElement | null>(null)
  const field = useRef<HTMLTextAreaElement | null>(null)
  const composed = useComposedRefs(ref, field)
  const config = useGoopConfig()
  const cue = useGoopCue('textarea', { sound })
  const handle = useFieldGoo(host, field, toInputOptions(engine, config), goo)
  useImperativeHandle(goopRef, () => handle as InputHandle, [handle])
  const active = handle !== null

  const textarea = <textarea ref={composed} data-slot="textarea" className={cn(textareaVariants(), active && goopFieldActive, className)} {...cue} {...rest} />
  if (!goo) return textarea
  return (
    <div
      ref={host}
      data-slot="textarea-goo"
      data-goop-host="textarea"
      data-goop-active={active ? '' : undefined}
      className={cn(goopFieldContainer, containerClassName)}
    >
      {textarea}
    </div>
  )
})
GoopTextarea.displayName = 'GoopTextarea'

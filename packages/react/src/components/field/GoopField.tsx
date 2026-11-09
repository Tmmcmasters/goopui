'use client'
// GoopField: shadcn/ui's Field (a `role="group"` div, `orientation` vertical | horizontal |
// responsive, `className` merge, same classes). No goo of its own: the controls inside keep
// theirs (a GoopInput's focus ring, a GoopCheckbox's fill, ...). Engine props set here (goo,
// drip, reveal, speed, preset, renderer) are inherited by GoopFieldError.
//
// GoopFieldError: shadcn/ui's FieldError (`role="alert"`, `children` or `errors`: unique
// messages, one as text, several as a list; renders nothing without either). When it appears
// it drips in (core `attachFieldError` after hydration): a small drop of the destructive
// colour falls from under the control into the message, which unrolls top-down behind it.
// `ref` is the message element, `goopRef` the engine. Its own engine props win over
// GoopField's. Before mount, during SSR, under reduced motion or with `goo={false}` it is a
// plain shadcn FieldError. The other parts are server-safe (./parts).
import { attachFieldError, type FieldErrorHandle } from '@goopui/core'
import { cn } from 'cn'
import { createContext, forwardRef, useContext, useImperativeHandle, useMemo, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { FIELD_PROP_KEYS, resolveFieldProps, splitProps, toFieldErrorOptions, type GoopFieldProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import { FIELD_ERROR, FIELD_ERROR_LIST, fieldErrorContent, fieldVariants, type FieldErrorItem, type FieldVariants } from './variants'

/** Provided by GoopField: its engine props, inherited by GoopFieldError. */
const FieldContext = createContext<GoopFieldProps | null>(null)

export type GoopFieldRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopFieldProps> & GoopFieldProps & FieldVariants

export const GoopField = forwardRef<HTMLDivElement, GoopFieldRootProps>(function GoopField(allProps, ref) {
  const [engine, props] = splitProps(allProps, FIELD_PROP_KEYS)
  const { className, orientation = 'vertical', ...rest } = props
  const inherited = useStableValue(resolveFieldProps(engine))
  return (
    <FieldContext.Provider value={inherited}>
      <div ref={ref} role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...rest} />
    </FieldContext.Provider>
  )
})
GoopField.displayName = 'GoopField'

export type GoopFieldErrorProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopFieldProps> &
  GoopFieldProps & {
    /** Error messages (strings or `{ message }` objects, e.g. react-hook-form's). */
    errors?: FieldErrorItem[]
    /** Receives the live drip handle (null before mount, while hidden or when off). */
    goopRef?: Ref<FieldErrorHandle>
  }

export const GoopFieldError = forwardRef<HTMLDivElement, GoopFieldErrorProps>(function GoopFieldError(allProps, ref) {
  const [engine, props] = splitProps(allProps, FIELD_PROP_KEYS)
  const { className, children, errors, goopRef, ...rest } = props
  const field = useContext(FieldContext)
  const options = useStableValue(toFieldErrorOptions(resolveFieldProps(engine, field), useGoopConfig()))
  const content = useMemo(() => {
    if (children) return children
    const c = fieldErrorContent(errors)
    if (c === null) return null
    if (typeof c === 'string') return c
    return (
      <ul className={FIELD_ERROR_LIST}>
        {c.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    )
  }, [children, errors])
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  // Attached while the message is shown: it drips in each time it appears.
  const handle = useAttached(el, attachFieldError, options ?? {}, options !== null && !!content)
  useImperativeHandle(goopRef, () => handle as FieldErrorHandle, [handle])

  if (!content) return null
  return (
    <div ref={composed} role="alert" data-slot="field-error" className={cn(FIELD_ERROR, className)} {...rest}>
      {content}
    </div>
  )
})
GoopFieldError.displayName = 'GoopFieldError'

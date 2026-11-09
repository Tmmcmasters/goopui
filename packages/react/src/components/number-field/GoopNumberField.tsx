'use client'
// GoopNumberField: a number field the shadcn/ui way (React has no NumberField primitive, so it
// is a plain text input plus +/- steppers, with the same parts, slots and classes as the Vue
// GoopNumberField): GoopNumberField (value / defaultValue / onValueChange, min / max / step,
// formatOptions, locale, disabled, id, name), GoopNumberFieldContent (the box holding the field
// and its buttons), GoopNumberFieldInput and GoopNumberFieldDecrement / Increment. The input is
// a `role="spinbutton"`: arrow keys step, Page Up / Down step by 10, Home / End jump to min /
// max, typing commits on blur or Enter; the buttons step on press and repeat while held.
//
// After hydration GoopNumberFieldContent attaches core's `attachNumberField`: the Input's goo
// focus ring around the field, +/- buttons that squish a goo dollop on press, and a nudge toward
// the pressed side (dollop + ring ripple) on every step. With `goo={false}` it is a plain field.
// Formatting uses Intl.NumberFormat with a fixed `locale` (default 'en-US'), so the server and
// the client print the same text.
import { attachNumberField, type NumberFieldHandle, type NumberFieldOptions } from '@goopui/core'
import { cn } from 'cn'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import { NUMBER_FIELD_PROP_KEYS, splitProps, toNumberFieldOptions, type GoopNumberFieldEngineProps, type GoopSoundProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import {
  goopNumberFieldActive,
  numberFieldContentVariants,
  numberFieldDecrementVariants,
  numberFieldIncrementVariants,
  numberFieldInputVariants,
  numberFieldVariants,
} from './variants'

interface NumberFieldState {
  value: number | undefined
  min?: number
  max?: number
  disabled: boolean
  id?: string
  name?: string
  format: (v: number | undefined) => string
  parse: (text: string) => number | undefined
  /** Set a typed value (clamped and rounded). */
  commit: (v: number | undefined) => void
  /** Step by `dir` steps (from the latest value). False when the value didn't change. */
  step: (dir: number) => boolean
  /** Snap to min (-1) or max (+1). */
  edge: (dir: number) => void
  input: MutableRefObject<HTMLInputElement | null>
  goo: boolean
  options: NumberFieldOptions
}

const Ctx = createContext<NumberFieldState | null>(null)
/** Whether the goo is attached (GoopNumberFieldContent tells its input). */
const ActiveCtx = createContext(false)

const useNumberField = (): NumberFieldState => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('GoopNumberField parts must be used inside <GoopNumberField>.')
  return ctx
}

const decimals = (n: number): number => {
  const s = String(n)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  return s.includes('.') ? s.split('.')[1]!.length : 0
}

export type GoopNumberFieldProps = Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange' | keyof GoopNumberFieldEngineProps> &
  GoopNumberFieldEngineProps &
  GoopSoundProps & {
    /** The controlled value (`null` or undefined-free: empty). */
    value?: number | null
    /** The initial value when uncontrolled. */
    defaultValue?: number
    /** Called with the new value (undefined: emptied). */
    onValueChange?: (value: number | undefined) => void
    min?: number
    max?: number
    /** Step size for the buttons and arrow keys. Default 1. */
    step?: number
    /** Intl.NumberFormat options for the shown text (currency, percent, units, ...). */
    formatOptions?: Intl.NumberFormatOptions
    /** Locale for formatting and parsing. Default 'en-US' (fixed, so SSR and the client agree). */
    locale?: string
    disabled?: boolean
    /** The input's id (for a <label htmlFor>). */
    id?: string
    /** The input's form name. */
    name?: string
    /** Master switch. `false` renders a plain number field. */
    goo?: boolean
    children?: ReactNode
  }

export const GoopNumberField = forwardRef<HTMLDivElement, GoopNumberFieldProps>(function GoopNumberField(allProps, ref) {
  const [engine, props] = splitProps(allProps, NUMBER_FIELD_PROP_KEYS)
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    min,
    max,
    step = 1,
    formatOptions,
    locale = 'en-US',
    disabled = false,
    id,
    name,
    goo = true,
    sound,
    className,
    children,
    ...rest
  } = props

  const [inner, setInner] = useState<number | undefined>(defaultValue)
  const controlled = valueProp !== undefined
  const value = controlled ? (valueProp ?? undefined) : inner
  const latest = useRef(value)
  latest.current = value
  const onChange = useRef(onValueChange)
  onChange.current = onValueChange

  const fmtOptions = useStableValue(formatOptions)
  const formatter = useMemo(() => new Intl.NumberFormat(locale, fmtOptions), [locale, fmtOptions])
  const format = useCallback((v: number | undefined) => (v === undefined || Number.isNaN(v) ? '' : formatter.format(v)), [formatter])
  const parse = useCallback(
    (text: string): number | undefined => {
      const decimal = formatter.formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.'
      const minus = /[-−]/.test(text)
      const cleaned = text.split(decimal).map((s) => s.replace(/\D/g, ''))
      const digits = cleaned.length > 1 ? `${cleaned[0]}.${cleaned.slice(1).join('')}` : cleaned[0]!
      if (!/\d/.test(digits)) return undefined
      let n = Number(digits) * (minus ? -1 : 1)
      if (fmtOptions?.style === 'percent') n /= 100
      return Number.isFinite(n) ? n : undefined
    },
    [formatter, fmtOptions],
  )

  const settle = useCallback(
    (v: number | undefined): number | undefined => {
      if (v === undefined || Number.isNaN(v)) return undefined
      let n = v
      if (min !== undefined) n = Math.max(min, n)
      if (max !== undefined) n = Math.min(max, n)
      return Number(n.toFixed(Math.min(20, Math.max(decimals(step), decimals(n)))))
    },
    [min, max, step],
  )
  const set = useCallback(
    (v: number | undefined): boolean => {
      const next = settle(v)
      if (next === latest.current) return false
      latest.current = next
      if (!controlled) setInner(next)
      onChange.current?.(next)
      return true
    },
    [settle, controlled],
  )
  const stepBy = useCallback(
    (dir: number): boolean => {
      if (disabled) return false
      const base = latest.current ?? min ?? 0
      const p = Math.max(decimals(step), decimals(base))
      return set(Number((base + dir * step).toFixed(p)))
    },
    [disabled, min, step, set],
  )
  const edge = useCallback(
    (dir: number) => {
      const target = dir < 0 ? min : max
      if (!disabled && target !== undefined) set(target)
    },
    [disabled, min, max, set],
  )

  const input = useRef<HTMLInputElement | null>(null)
  const config = useGoopConfig()
  const options = useStableValue(toNumberFieldOptions(engine, config))
  useGoopSound(sound)

  const state: NumberFieldState = {
    value,
    min,
    max,
    disabled,
    id,
    name,
    format,
    parse,
    commit: set,
    step: stepBy,
    edge,
    input,
    goo,
    options,
  }
  return (
    <Ctx.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <div ref={ref} data-slot="number-field" data-disabled={disabled ? '' : undefined} className={cn(numberFieldVariants(), className)} {...rest}>
          {children}
        </div>
      </GoopSoundScope>
    </Ctx.Provider>
  )
})
GoopNumberField.displayName = 'GoopNumberField'

export type GoopNumberFieldContentProps = ComponentPropsWithoutRef<'div'> & {
  /** Receives the live goo handle (null before mount / when goo is off). */
  goopRef?: Ref<NumberFieldHandle>
}

/** The relative box holding the field and its +/- buttons; the goo host. */
export const GoopNumberFieldContent = forwardRef<HTMLDivElement, GoopNumberFieldContentProps>(function GoopNumberFieldContent(
  { className, goopRef, children, ...props },
  ref,
) {
  const ctx = useNumberField()
  const host = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, host)
  const attach = (el: HTMLElement, o: NumberFieldOptions): NumberFieldHandle => {
    const field = el.querySelector<HTMLInputElement>('input[data-slot="input"]') ?? el.querySelector('input')!
    return attachNumberField(el, field, o)
  }
  const handle = useAttached(host, attach, ctx.options, ctx.goo)
  useImperativeHandle(goopRef, () => handle as NumberFieldHandle, [handle])

  // Every value change nudges toward the side it came from (core skips typed commits).
  const prev = useRef(ctx.value)
  useIsomorphicLayoutEffect(() => {
    const before = prev.current
    prev.current = ctx.value
    if (typeof ctx.value === 'number' && typeof before === 'number' && ctx.value !== before) handle?.nudge(Math.sign(ctx.value - before))
  }, [ctx.value, handle])

  return (
    <div
      ref={composed}
      data-slot="number-field-content"
      data-goop-host={ctx.goo ? 'number-field' : undefined}
      data-goop-active={handle ? '' : undefined}
      className={cn(numberFieldContentVariants(), className)}
      {...props}
    >
      <ActiveCtx.Provider value={handle !== null}>{children}</ActiveCtx.Provider>
    </div>
  )
})
GoopNumberFieldContent.displayName = 'GoopNumberFieldContent'

export type GoopNumberFieldInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'defaultValue' | 'type'>

/** The field: a text input with `role="spinbutton"`, centred, showing the formatted value. */
export const GoopNumberFieldInput = forwardRef<HTMLInputElement, GoopNumberFieldInputProps>(function GoopNumberFieldInput(
  { className, onChange, onBlur, onKeyDown, ...props },
  ref,
) {
  const ctx = useNumberField()
  const active = useContext(ActiveCtx)
  const composed = useComposedRefs(ref, ctx.input)
  const [editing, setEditing] = useState<string | null>(null)
  const commitText = () => {
    if (editing === null) return
    ctx.commit(ctx.parse(editing))
    setEditing(null)
  }
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    const go = (fn: () => void) => {
      e.preventDefault()
      if (editing !== null) {
        ctx.commit(ctx.parse(editing))
        setEditing(null)
      }
      fn()
    }
    if (e.key === 'ArrowUp') go(() => ctx.step(1))
    else if (e.key === 'ArrowDown') go(() => ctx.step(-1))
    else if (e.key === 'PageUp') go(() => ctx.step(10))
    else if (e.key === 'PageDown') go(() => ctx.step(-10))
    else if (e.key === 'Home' && ctx.min !== undefined) go(() => ctx.edge(-1))
    else if (e.key === 'End' && ctx.max !== undefined) go(() => ctx.edge(1))
    else if (e.key === 'Enter') commitText()
  }
  return (
    <input
      ref={composed}
      type="text"
      id={ctx.id}
      name={ctx.name}
      data-slot="input"
      role="spinbutton"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-roledescription="Number field"
      aria-valuenow={ctx.value}
      aria-valuemin={ctx.min}
      aria-valuemax={ctx.max}
      aria-valuetext={ctx.value === undefined ? undefined : ctx.format(ctx.value)}
      disabled={ctx.disabled}
      value={editing ?? ctx.format(ctx.value)}
      onChange={(e) => {
        onChange?.(e)
        setEditing(e.target.value)
      }}
      onBlur={(e) => {
        onBlur?.(e)
        commitText()
      }}
      onKeyDown={keys}
      className={cn(numberFieldInputVariants(), active && goopNumberFieldActive, className)}
      {...props}
    />
  )
})
GoopNumberFieldInput.displayName = 'GoopNumberFieldInput'

type StepperProps = ComponentPropsWithoutRef<'button'>

const MINUS = <path d="M5 12h14" />
const PLUS = (
  <>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </>
)

/** First repeat after this long held, then every REPEAT_MS (reka's NumberField feel). */
const HOLD_MS = 400
const REPEAT_MS = 60

function useStepper(dir: 1 | -1, props: StepperProps) {
  const ctx = useNumberField()
  const cue = useGoopCue('numberFieldStep')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stop = () => {
    clearTimeout(timer.current)
    clearInterval(timer.current)
    timer.current = undefined
  }
  useEffect(() => stop, [])
  const atEdge = ctx.value !== undefined && (dir < 0 ? ctx.min !== undefined && ctx.value <= ctx.min : ctx.max !== undefined && ctx.value >= ctx.max)
  const disabled = props.disabled || ctx.disabled || atEdge
  useEffect(() => {
    if (disabled) stop()
  }, [disabled])
  const { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onClick, ...rest } = props
  return {
    ...cue,
    ...rest,
    type: 'button' as const,
    tabIndex: -1,
    disabled,
    'aria-label': rest['aria-label'] ?? (dir < 0 ? 'Decrease' : 'Increase'),
    'aria-controls': ctx.id,
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(e)
      if (e.defaultPrevented || e.button !== 0 || disabled) return
      // Keep focus in the field (the goo ring flows in from this side).
      e.preventDefault()
      ctx.input.current?.focus()
      stop()
      if (!ctx.step(dir)) return
      timer.current = setTimeout(() => {
        timer.current = setInterval(() => {
          if (!ctx.step(dir)) stop()
        }, REPEAT_MS)
      }, HOLD_MS)
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      onPointerUp?.(e)
      stop()
    },
    onPointerLeave: (e: PointerEvent<HTMLButtonElement>) => {
      onPointerLeave?.(e)
      stop()
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      onPointerCancel?.(e)
      stop()
    },
    // A click with no pointer press (assistive tech, Enter / Space on a focused button).
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      if (!e.defaultPrevented && e.detail === 0 && !disabled) ctx.step(dir)
    },
  }
}

const icon = (paths: ReactNode) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-4 w-4"
  >
    {paths}
  </svg>
)

/** The − button. Inside an active GoopNumberField a press squishes a goo dollop under it. */
export const GoopNumberFieldDecrement = forwardRef<HTMLButtonElement, StepperProps>(function GoopNumberFieldDecrement({ className, children, ...props }, ref) {
  const p = useStepper(-1, props)
  return (
    <button ref={ref} data-slot="decrement" {...p} className={cn(numberFieldDecrementVariants(), className)}>
      {children ?? icon(MINUS)}
    </button>
  )
})
GoopNumberFieldDecrement.displayName = 'GoopNumberFieldDecrement'

/** The + button. Inside an active GoopNumberField a press squishes a goo dollop under it. */
export const GoopNumberFieldIncrement = forwardRef<HTMLButtonElement, StepperProps>(function GoopNumberFieldIncrement({ className, children, ...props }, ref) {
  const p = useStepper(1, props)
  return (
    <button ref={ref} data-slot="increment" {...p} className={cn(numberFieldIncrementVariants(), className)}>
      {children ?? icon(PLUS)}
    </button>
  )
})
GoopNumberFieldIncrement.displayName = 'GoopNumberFieldIncrement'

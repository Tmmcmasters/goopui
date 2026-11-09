'use client'
// GoopInputOTP: shadcn/ui's InputOTP on input-otp (`OTPInput`: maxLength, value / onChange,
// pattern, onComplete, ... all forwarded; `className` / `containerClassName` merge; the `ref` is
// the hidden <input>), with its parts GoopInputOTPGroup, GoopInputOTPSlot and
// GoopInputOTPSeparator. After hydration core's `attachInputOTP` puts one aria-hidden goo layer
// in the OTP container, behind the slots: the active slot holds a pool of goo that flows into
// the next slot as you type (and back on Backspace), with a small pulse as each character
// lands; blur drains it. input-otp's slots are render-only (one hidden input takes the
// keystrokes), so the active slot reaches core through `setActive` instead of focus.
// With `goo={false}` it is exactly shadcn's InputOTP. Reduced motion: a static fill.
import { attachInputOTP, type InputOTPHandle } from '@goopui/core'
import { cn } from 'cn'
import { OTPInput, OTPInputContext, type OTPInputProps } from 'input-otp'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import { INPUT_OTP_PROP_KEYS, splitProps, toInputOTPOptions, type GoopInputOTPEngineProps, type GoopSoundProps } from '../../goop-props'
import { useGoopCue } from '../../sound'
import { useAttached } from '../../use-goop'
import { setRef, useIsomorphicLayoutEffect } from '../../utils'
import {
  goopOTPSlotActive,
  inputOTPCaretVariants,
  inputOTPGroupVariants,
  inputOTPInputVariants,
  inputOTPSeparatorVariants,
  inputOTPSlotVariants,
  inputOTPVariants,
} from './variants'

/** Whether the goo is attached (the active slot then drops shadcn's ring: the goo is the
 *  focus indicator). */
const OTPGooContext = createContext(false)

export type GoopInputOTPProps = Omit<OTPInputProps, 'render' | 'children' | keyof GoopInputOTPEngineProps> &
  GoopInputOTPEngineProps &
  GoopSoundProps & {
    children?: ReactNode
    /** Master switch. `false` renders a plain shadcn InputOTP. */
    goo?: boolean
    /** Receives the live goo handle (null before mount / when goo is off). */
    goopRef?: Ref<InputOTPHandle>
  }

/** Follows input-otp's slots (the active one, and characters landing) into the engine. */
function OTPGoo({ handle }: { handle: InputOTPHandle | null }) {
  const { slots } = useContext(OTPInputContext)
  const active = slots.findIndex((s) => s.isActive)
  const chars = useRef<(string | null)[] | null>(null)
  if (chars.current === null) chars.current = slots.map((s) => s.char)
  useIsomorphicLayoutEffect(() => {
    handle?.setActive(active)
  }, [handle, active])
  useIsomorphicLayoutEffect(() => {
    const prev = chars.current ?? []
    slots.forEach((s, i) => {
      if (s.char && s.char !== prev[i]) handle?.pulse(i)
    })
    chars.current = slots.map((s) => s.char)
  })
  return null
}

export const GoopInputOTP = forwardRef<HTMLInputElement, GoopInputOTPProps>(function GoopInputOTP(allProps, ref) {
  const [engine, props] = splitProps(allProps, INPUT_OTP_PROP_KEYS)
  const { className, containerClassName, goo = true, sound, goopRef, children, value, defaultValue, onChange, ...rest } = props
  // input-otp keeps `defaultValue` as its initial state but also hands it to its controlled
  // <input> (React warns about value + defaultValue): hold the uncontrolled value here instead.
  const [inner, setInner] = useState(typeof defaultValue === 'string' ? defaultValue : '')
  const controlled = value !== undefined
  const change = useCallback(
    (v: string) => {
      if (!controlled) setInner(v)
      onChange?.(v)
    },
    [controlled, onChange],
  )

  // The goo host is input-otp's container (the hidden input's grandparent).
  const host = useRef<HTMLElement | null>(null)
  const setInput = useCallback(
    (node: HTMLInputElement | null) => {
      host.current = node?.closest<HTMLElement>('[data-input-otp-container]') ?? null
      setRef(ref, node)
    },
    [ref],
  )
  const config = useGoopConfig()
  const cue = useGoopCue('inputOtp', { sound })
  const handle = useAttached(host, attachInputOTP, toInputOTPOptions(engine, config), goo)
  useImperativeHandle(goopRef, () => handle as InputOTPHandle, [handle])
  const active = handle !== null

  // Mirror the Vue root's host attributes on the container (input-otp gives it no props).
  useIsomorphicLayoutEffect(() => {
    const el = host.current
    if (!el || !active) return
    el.setAttribute('data-goop-host', 'input-otp')
    el.setAttribute('data-goop-active', '')
    return () => {
      el.removeAttribute('data-goop-host')
      el.removeAttribute('data-goop-active')
    }
  }, [active])

  return (
    <OTPInput
      ref={setInput}
      data-slot="input-otp"
      containerClassName={cn(inputOTPVariants(), containerClassName)}
      className={cn(inputOTPInputVariants(), className)}
      {...cue}
      {...(rest as Omit<OTPInputProps, 'render' | 'children'>)}
      value={controlled ? value : inner}
      onChange={change}
    >
      <OTPGooContext.Provider value={active}>
        {children}
        {goo ? <OTPGoo handle={handle} /> : null}
      </OTPGooContext.Provider>
    </OTPInput>
  )
})
GoopInputOTP.displayName = 'GoopInputOTP'

/** shadcn's InputOTPGroup: a run of joined slots. */
export const GoopInputOTPGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function GoopInputOTPGroup({ className, ...props }, ref) {
  return <div ref={ref} data-slot="input-otp-group" className={cn(inputOTPGroupVariants(), className)} {...props} />
})
GoopInputOTPGroup.displayName = 'GoopInputOTPGroup'

export type GoopInputOTPSlotProps = ComponentPropsWithoutRef<'div'> & {
  /** The slot's position in the code, as in shadcn. */
  index: number
}

/** shadcn's InputOTPSlot: one cell (its character, and the fake caret while active and empty). */
export const GoopInputOTPSlot = forwardRef<HTMLDivElement, GoopInputOTPSlotProps>(function GoopInputOTPSlot({ index, className, ...props }, ref) {
  const ctx = useContext(OTPInputContext)
  const active = useContext(OTPGooContext)
  const { char, hasFakeCaret, isActive } = ctx?.slots[index] ?? {}
  return (
    <div ref={ref} data-slot="input-otp-slot" data-active={isActive} className={cn(inputOTPSlotVariants(), active && goopOTPSlotActive, className)} {...props}>
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div data-goop-caret="" className={inputOTPCaretVariants()} />
        </div>
      ) : null}
    </div>
  )
})
GoopInputOTPSlot.displayName = 'GoopInputOTPSlot'

/** shadcn's InputOTPSeparator (role="separator", a minus by default). */
export const GoopInputOTPSeparator = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function GoopInputOTPSeparator(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} data-slot="input-otp-separator" role="separator" className={cn(inputOTPSeparatorVariants(), className)} {...props}>
      {children ?? (
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
        >
          <path d="M5 12h14" />
        </svg>
      )}
    </div>
  )
})
GoopInputOTPSeparator.displayName = 'GoopInputOTPSeparator'

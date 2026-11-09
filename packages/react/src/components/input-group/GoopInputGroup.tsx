'use client'
// GoopInputGroup: shadcn/ui's InputGroup (a `role="group"` box holding addons, buttons and a
// text control; `className` merge; props and the `ref` go on the group) with GoopInput's goo
// focus ring around the whole group (core `attachInputGroup` after hydration). Focus in the
// input (or textarea) flows goo around the group's border from the click point; typing
// ripples it near the caret; leaving the controls drains it; aria-invalid on any part turns it
// destructive with a small drip. Core draws on an aria-hidden layer in a wrapper
// (`data-slot="input-group-goo"`, in the server markup too, so hydration matches). With
// `goo={false}` it is a plain shadcn InputGroup (no wrapper). Reduced motion: a static ring.
//
// GoopInputGroupButton is a GoopButton (ghost, xs), so it has its own goo exactly like one.
// GoopInputGroupInput / GoopInputGroupTextarea are plain fields (the group's ring is theirs;
// shadcn's group selectors need them to be direct children). GoopInputGroupAddon focuses the
// field when clicked (not on a button in it). GoopInputGroupText is server-safe (./parts).
import { attachInputGroup, type InputHandle, type InputOptions } from '@goopui/core'
import { cn } from 'cn'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type MouseEvent, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { INPUT_GROUP_PROP_KEYS, splitProps, toInputGroupOptions, type GoopInputGroupProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { GoopButton, type GoopButtonProps } from '../button/GoopButton'
import { inputVariants, textareaVariants } from '../input/variants'
import {
  INPUT_GROUP,
  INPUT_GROUP_INPUT,
  INPUT_GROUP_TEXTAREA,
  goopInputGroupActive,
  goopInputGroupContainer,
  goopInputGroupControlActive,
  inputGroupAddonVariants,
  inputGroupButtonVariants,
  type InputGroupAddonAlign,
  type InputGroupButtonSize,
} from './styles'

/** Provided by GoopInputGroup: whether its goo ring is attached (the controls drop outlines). */
const ActiveContext = createContext(false)

export type GoopInputGroupRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopInputGroupProps> &
  GoopInputGroupProps & {
    /** Classes for the wrapper that holds the goo layer (default `relative w-full min-w-0`). */
    containerClassName?: string
    /** Receives the live goo handle (null before mount / when goo is off). */
    goopRef?: Ref<InputHandle>
  }

export const GoopInputGroup = forwardRef<HTMLDivElement, GoopInputGroupRootProps>(function GoopInputGroup(allProps, ref) {
  const [engine, props] = splitProps(allProps, INPUT_GROUP_PROP_KEYS)
  const { className, containerClassName, goopRef, ...rest } = props
  const goo = engine.goo !== false
  const options = toInputGroupOptions(engine, useGoopConfig())

  const host = useRef<HTMLDivElement | null>(null)
  const group = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, group)
  const attach = (el: HTMLElement, o: InputOptions): InputHandle => attachInputGroup(el, group.current!, o)
  const handle = useAttached(host, attach, options ?? {}, goo)
  useImperativeHandle(goopRef, () => handle as InputHandle, [handle])
  const active = handle !== null

  const box = (
    <div ref={composed} data-slot="input-group" role="group" className={cn(INPUT_GROUP, active && goopInputGroupActive, className)} {...rest} />
  )
  return (
    <ActiveContext.Provider value={active}>
      {goo ? (
        <div
          ref={host}
          data-slot="input-group-goo"
          data-goop-host="input-group"
          data-goop-active={active ? '' : undefined}
          className={cn(goopInputGroupContainer, containerClassName)}
        >
          {box}
        </div>
      ) : (
        box
      )}
    </ActiveContext.Provider>
  )
})
GoopInputGroup.displayName = 'GoopInputGroup'

export type GoopInputGroupAddonProps = ComponentPropsWithoutRef<'div'> & { align?: InputGroupAddonAlign | null }

export const GoopInputGroupAddon = forwardRef<HTMLDivElement, GoopInputGroupAddonProps>(function GoopInputGroupAddon(
  { className, align = 'inline-start', onClick, ...props },
  ref,
) {
  const click = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e)
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.parentElement?.querySelector<HTMLElement>('input, textarea')?.focus()
  }
  return (
    <div
      ref={ref}
      role="group"
      data-slot="input-group-addon"
      data-align={align ?? 'inline-start'}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={click}
      {...props}
    />
  )
})
GoopInputGroupAddon.displayName = 'GoopInputGroupAddon'

export type GoopInputGroupButtonProps = Omit<GoopButtonProps, 'size'> & { size?: InputGroupButtonSize | null }

export const GoopInputGroupButton = forwardRef<HTMLButtonElement, GoopInputGroupButtonProps>(function GoopInputGroupButton(
  { className, type = 'button', variant = 'ghost', size = 'xs', ...props },
  ref,
) {
  return (
    <GoopButton
      ref={ref}
      type={type}
      data-size={size ?? 'xs'}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
})
GoopInputGroupButton.displayName = 'GoopInputGroupButton'

export type GoopInputGroupInputProps = ComponentPropsWithoutRef<'input'>

export const GoopInputGroupInput = forwardRef<HTMLInputElement, GoopInputGroupInputProps>(function GoopInputGroupInput({ className, ...props }, ref) {
  const active = useContext(ActiveContext)
  return (
    <input
      ref={ref}
      data-slot="input-group-control"
      className={cn(inputVariants(), INPUT_GROUP_INPUT, active && goopInputGroupControlActive, className)}
      {...props}
    />
  )
})
GoopInputGroupInput.displayName = 'GoopInputGroupInput'

export type GoopInputGroupTextareaProps = ComponentPropsWithoutRef<'textarea'>

export const GoopInputGroupTextarea = forwardRef<HTMLTextAreaElement, GoopInputGroupTextareaProps>(function GoopInputGroupTextarea(
  { className, ...props },
  ref,
) {
  const active = useContext(ActiveContext)
  return (
    <textarea
      ref={ref}
      data-slot="input-group-control"
      className={cn(textareaVariants(), INPUT_GROUP_TEXTAREA, active && goopInputGroupControlActive, className)}
      {...props}
    />
  )
})
GoopInputGroupTextarea.displayName = 'GoopInputGroupTextarea'

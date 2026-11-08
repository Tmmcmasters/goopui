'use client'
// GoopCheckbox: shadcn/ui's Checkbox (Radix Checkbox Root/Indicator, `checked` incl.
// 'indeterminate', `className` merge, same classes) where checking drops goo into the box.
// After mount core's `attachCheckbox` adds one aria-hidden goo layer inside the box; the real
// check icon stays unfiltered on top and is hidden (`data-goop-mark`) while the goo lands.
// Before mount, during SSR, or with `goo={false}` it is a plain shadcn Checkbox.
import { attachCheckbox, type CheckboxHandle, type CheckboxState } from '@goopui/core'
import { cn } from 'cn'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { forwardRef, useImperativeHandle, useRef, useState, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { CHECKBOX_PROP_KEYS, splitProps, toCheckboxOptions, type GoopCheckboxEngineProps, type GoopSoundProps } from '../../goop-props'
import { useGoopCue } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { checkboxIndicatorVariants, checkboxVariants, goopCheckboxColors, goopCheckboxFilledBox } from './variants'

export type GoopCheckboxProps = Omit<ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, keyof GoopCheckboxEngineProps> &
  GoopCheckboxEngineProps &
  GoopSoundProps & {
    /** Master switch. `false` renders a plain shadcn Checkbox. */
    goo?: boolean
    /** Receives the live checkbox handle (null before mount / when goo is off). */
    goopRef?: Ref<CheckboxHandle>
  }

export const GoopCheckbox = forwardRef<HTMLButtonElement, GoopCheckboxProps>(function GoopCheckbox(allProps, ref) {
  const [engine, props] = splitProps(allProps, CHECKBOX_PROP_KEYS)
  const { className, goo = true, sound, goopRef, checked: checkedProp, defaultChecked, onCheckedChange, children, ...rest } = props

  const [inner, setInner] = useState<CheckboxState>(defaultChecked ?? false)
  const controlled = checkedProp !== undefined
  const checked: CheckboxState = controlled ? checkedProp : inner
  const onChange = (v: CheckboxState): void => {
    if (!controlled) setInner(v)
    onCheckedChange?.(v)
  }

  const el = useRef<HTMLButtonElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const cue = useGoopCue('checkbox', { sound })
  const handle = useAttached(el, attachCheckbox, { ...toCheckboxOptions(engine, config), checked }, goo)
  useImperativeHandle(goopRef, () => handle as CheckboxHandle, [handle])
  const active = handle !== null
  const fillOn = engine.fill !== false && engine.fill !== 0

  return (
    <CheckboxPrimitive.Root
      ref={composed}
      data-slot="checkbox"
      data-goop-host={goo ? 'checkbox' : undefined}
      data-goop-active={active ? '' : undefined}
      checked={checked}
      onCheckedChange={onChange}
      className={cn(checkboxVariants(), goo && goopCheckboxColors, active && fillOn && goopCheckboxFilledBox, className)}
      {...cue}
      {...rest}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" data-goop-mark={goo ? '' : undefined} className={checkboxIndicatorVariants()}>
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
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
GoopCheckbox.displayName = 'GoopCheckbox'

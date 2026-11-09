'use client'
// GoopRadioGroup: shadcn/ui's RadioGroup (Radix RadioGroup Root / Item / Indicator, `value` /
// `defaultValue` / `onValueChange`, `className` merge, same classes) whose selected dot is a
// goo blob that jumps between items. After mount core's `attachRadioGroup` adds one
// aria-hidden goo layer to the root; every selection change (click, keyboard, `value`)
// re-reads the checked item and the blob bridges, flies and splats there. Inside an active
// group the checked GoopRadioGroupItem drops its own fill (the blob is the fill) and its dot is
// a `data-goop-mark`, hidden while the blob is still landing. Before mount, during SSR, or with
// `goo={false}` it is a plain shadcn RadioGroup, so hydration matches.
import { attachRadioGroup, type RadioGroupHandle } from '@goopui/core'
import { cn } from 'cn'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, useState, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { RADIO_PROP_KEYS, splitProps, toRadioOptions, type GoopRadioEngineProps, type GoopSoundProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { goopRadioGroupColors, goopRadioGroupItemFilled, radioGroupDotVariants, radioGroupIndicatorVariants, radioGroupItemVariants, radioGroupVariants } from './variants'

/** What GoopRadioGroup tells its items: is the goo blob attached (items then drop their fill)? */
const GroupContext = createContext<{ active: boolean } | null>(null)
const ACTIVE = { active: true }
const IDLE = { active: false }

export type GoopRadioGroupProps = Omit<ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>, keyof GoopRadioEngineProps> &
  GoopRadioEngineProps &
  GoopSoundProps & {
    /** Master switch. `false` renders a plain shadcn RadioGroup. */
    goo?: boolean
    /** Receives the live radio group handle (null before mount / when goo is off). */
    goopRef?: Ref<RadioGroupHandle>
  }

export const GoopRadioGroup = forwardRef<HTMLDivElement, GoopRadioGroupProps>(function GoopRadioGroup(allProps, ref) {
  const [engine, props] = splitProps(allProps, RADIO_PROP_KEYS)
  const { className, goo = true, sound, goopRef, value: valueProp, defaultValue, onValueChange, ...rest } = props

  // Controlled (`value`) or not (`defaultValue`); core is told the selection either way.
  // Radix always gets a defined value (null: nothing selected), so it never switches between
  // uncontrolled and controlled.
  const [inner, setInner] = useState<string | null>(defaultValue ?? null)
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : inner
  const onChange = (v: string): void => {
    if (!controlled) setInner(v)
    onValueChange?.(v)
  }

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const on = useGoopSound(sound)
  const handle = useAttached(el, attachRadioGroup, { ...toRadioOptions(engine, config), value }, goo)
  useImperativeHandle(goopRef, () => handle as RadioGroupHandle, [handle])
  const active = handle !== null

  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <GroupContext.Provider value={active ? ACTIVE : IDLE}>
        <RadioGroupPrimitive.Root
          ref={composed}
          data-slot="radio-group"
          data-goop-host={goo ? 'radio-group' : undefined}
          data-goop-active={active ? '' : undefined}
          value={value}
          onValueChange={onChange}
          className={cn(radioGroupVariants(), goo && goopRadioGroupColors, className)}
          {...rest}
        />
      </GroupContext.Provider>
    </GoopSoundScope>
  )
})
GoopRadioGroup.displayName = 'GoopRadioGroup'

export type GoopRadioGroupItemProps = ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>

/** shadcn/ui's RadioGroupItem (same classes, `className` merge, `asChild`). `children`
 *  replaces the dot. */
export const GoopRadioGroupItem = forwardRef<HTMLButtonElement, GoopRadioGroupItemProps>(function GoopRadioGroupItem(
  { className, children, ...props },
  ref,
) {
  const group = useContext(GroupContext)
  const cue = useGoopCue('radioItem')
  const active = group?.active ?? false
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      data-slot="radio-group-item"
      className={cn(radioGroupItemVariants(), active && goopRadioGroupItemFilled, className)}
      {...cue}
      {...props}
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" data-goop-mark={group ? '' : undefined} className={radioGroupIndicatorVariants()}>
        {children ?? <span className={radioGroupDotVariants()} />}
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
GoopRadioGroupItem.displayName = 'GoopRadioGroupItem'

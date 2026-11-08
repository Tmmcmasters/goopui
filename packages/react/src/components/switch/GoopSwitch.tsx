'use client'
// GoopSwitch: shadcn/ui's Switch (Radix Switch Root/Thumb, `checked` / `defaultChecked` /
// `onCheckedChange`, `size`, `className` merge, same classes) whose thumb is a goo blob. After
// mount core's `attachSwitch` adds two aria-hidden goo layers inside the track: the primary
// fill, and the thumb on top of it. The real thumb stays in place (transparent) and Radix keeps
// role="switch", aria-checked and keyboard handling. aria-checked / data-state flip on click;
// the colors (thumb, track) wait for the thumb to hit the wall (core's
// `data-goop-switch-state`), then the new color floods in as a wave. Before mount, during SSR,
// or with `goo={false}` it is a plain shadcn Switch, so hydration matches exactly.
import { attachSwitch, type SwitchHandle } from '@goopui/core'
import { cn } from 'cn'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { forwardRef, useImperativeHandle, useRef, useState, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { SWITCH_PROP_KEYS, splitProps, toSwitchOptions, type GoopSoundProps, type GoopSwitchEngineProps } from '../../goop-props'
import { useGoopCue } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import {
  goopSwitchColors,
  goopSwitchFilledTrack,
  goopSwitchShownColors,
  goopSwitchShownTrack,
  switchThumbVariants,
  switchVariants,
  type SwitchSize,
} from './variants'

export type GoopSwitchProps = Omit<ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, keyof GoopSwitchEngineProps> &
  GoopSwitchEngineProps &
  GoopSoundProps & {
    size?: SwitchSize
    /** Master switch. `false` renders a plain shadcn Switch. */
    goo?: boolean
    /** Receives the live switch handle (null before mount / when goo is off). */
    goopRef?: Ref<SwitchHandle>
  }

export const GoopSwitch = forwardRef<HTMLButtonElement, GoopSwitchProps>(function GoopSwitch(allProps, ref) {
  const [engine, props] = splitProps(allProps, SWITCH_PROP_KEYS)
  const { className, size = 'default', goo = true, sound, goopRef, checked: checkedProp, defaultChecked, onCheckedChange, ...rest } = props

  // Controlled (`checked`) or not (`defaultChecked`); core needs the state either way.
  const [inner, setInner] = useState(!!defaultChecked)
  const controlled = checkedProp !== undefined
  const checked = controlled ? checkedProp : inner
  const onChange = (v: boolean): void => {
    if (!controlled) setInner(v)
    onCheckedChange?.(v)
  }

  const el = useRef<HTMLButtonElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const cue = useGoopCue('switch', { sound })
  const handle = useAttached(el, attachSwitch, { ...toSwitchOptions(engine, config), checked }, goo)
  useImperativeHandle(goopRef, () => handle as SwitchHandle, [handle])
  const active = handle !== null

  const fillOn = engine.fill !== false && engine.fill !== 0
  return (
    <SwitchPrimitive.Root
      ref={composed}
      data-slot="switch"
      data-size={size}
      data-goop-host={goo ? 'switch' : undefined}
      data-goop-active={active ? '' : undefined}
      checked={checked}
      onCheckedChange={onChange}
      className={cn(
        switchVariants(),
        // Attached, the colors follow core's shown state (old state until impact), not data-state.
        goo && (active ? goopSwitchShownColors : goopSwitchColors),
        active && (fillOn ? goopSwitchFilledTrack : goopSwitchShownTrack),
        className,
      )}
      {...cue}
      {...rest}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={switchThumbVariants()}
        style={active ? { backgroundColor: 'transparent' } : undefined}
      />
    </SwitchPrimitive.Root>
  )
})
GoopSwitch.displayName = 'GoopSwitch'

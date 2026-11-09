'use client'
// GoopToggleGroup: shadcn/ui's ToggleGroup (Radix ToggleGroup Root / Item, `type` single |
// multiple, `value` / `defaultValue` / `onValueChange`, variant / size / spacing shared with the
// items, `className` merge) whose pressed fills are one goo layer on the root. After mount
// core's `attachToggleGroup` attaches it: pressing an item floods it from the press point,
// un-pressing drains it; in single mode the goo flows from the old item to the new one;
// neighbouring pressed items merge into one body and tear apart. Inside an active group a
// pressed GoopToggleGroupItem drops its own background (the group's goo is the fill). Before
// mount, during SSR, or with `goo={false}` it is a plain shadcn ToggleGroup.
import { attachToggleGroup, type ToggleGroupOptions, type ToggleHandle } from '@goopui/core'
import { cn } from 'cn'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import { TOGGLE_GROUP_PROP_KEYS, splitProps, toToggleGroupOptions, type GoopSoundProps, type GoopToggleGroupEngineProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { goopToggleColors, goopToggleItemFilled, toggleVariants, type ToggleVariants } from '../toggle/variants'
import { toggleGroupItemVariants, toggleGroupVariants } from './variants'

/** What GoopToggleGroup tells its items: shared variant / size / spacing, and whether the goo
 *  is attached (pressed items then drop their own background). */
interface GroupContextValue extends ToggleVariants {
  spacing: number
  active: boolean
}
const GroupContext = createContext<GroupContextValue | null>(null)

/** Radix finds items by role; core reads them by data-slot (single-type items are
 *  role="radio" with aria-checked, so core's default `[aria-pressed]` would miss them). */
const ITEM = '[data-slot="toggle-group-item"]'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type GroupOwnProps = GoopToggleGroupEngineProps &
  GoopSoundProps &
  ToggleVariants & {
    /** Gap between items in Tailwind spacing units (0 = joined, shadcn's default). */
    spacing?: number
    /** Master switch. `false` renders a plain shadcn ToggleGroup. */
    goo?: boolean
    /** Receives the live toggle group handle (null before mount / when goo is off). */
    goopRef?: Ref<ToggleHandle>
  }

export type GoopToggleGroupProps = DistributiveOmit<ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>, keyof GroupOwnProps> & GroupOwnProps

export const GoopToggleGroup = forwardRef<HTMLDivElement, GoopToggleGroupProps>(function GoopToggleGroup(allProps, ref) {
  const [engine, props] = splitProps(allProps as GoopToggleGroupProps & GoopToggleGroupEngineProps, TOGGLE_GROUP_PROP_KEYS)
  const {
    className,
    style,
    variant,
    size,
    spacing = 0,
    orientation = 'horizontal',
    goo = true,
    sound,
    goopRef,
    type,
    value: valueProp,
    defaultValue,
    onValueChange,
    children,
    ...rest
  } = props as Omit<GoopToggleGroupProps, 'type' | 'value' | 'defaultValue' | 'onValueChange'> & {
    type: 'single' | 'multiple'
    value?: string | string[]
    defaultValue?: string | string[]
    onValueChange?: (v: never) => void
  }

  // Controlled (`value`) or not (`defaultValue`); core is told the value either way. Radix
  // always gets a defined value ('' / []: nothing pressed).
  const multiple = type === 'multiple'
  const [inner, setInner] = useState<string | string[]>(defaultValue ?? (multiple ? [] : ''))
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : inner
  const onChange = (v: string | string[]): void => {
    if (!controlled) setInner(v)
    ;(onValueChange as ((v: string | string[]) => void) | undefined)?.(v)
  }

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const on = useGoopSound(sound)
  const options: ToggleGroupOptions = { ...toToggleGroupOptions(engine, config), value, item: ITEM }
  const handle = useAttached(el, attachToggleGroup, options, goo)
  useImperativeHandle(goopRef, () => handle as ToggleHandle, [handle])
  const active = handle !== null
  const ctx = useMemo(() => ({ variant, size, spacing, active }), [variant, size, spacing, active])

  const root = {
    ref: composed,
    'data-slot': 'toggle-group',
    'data-variant': variant ?? undefined,
    'data-size': size ?? undefined,
    'data-spacing': spacing,
    orientation,
    'data-orientation': orientation,
    'data-goop-host': goo ? 'toggle-group' : undefined,
    'data-goop-active': active ? '' : undefined,
    style: { '--gap': spacing, ...style } as CSSProperties,
    className: cn(toggleGroupVariants(), goo && goopToggleColors, className),
    ...rest,
  }
  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <GroupContext.Provider value={ctx}>
        {multiple ? (
          <ToggleGroupPrimitive.Root {...root} type="multiple" value={value as string[]} onValueChange={onChange}>
            {children}
          </ToggleGroupPrimitive.Root>
        ) : (
          <ToggleGroupPrimitive.Root {...root} type="single" value={value as string} onValueChange={onChange}>
            {children}
          </ToggleGroupPrimitive.Root>
        )}
      </GroupContext.Provider>
    </GoopSoundScope>
  )
})
GoopToggleGroup.displayName = 'GoopToggleGroup'

export type GoopToggleGroupItemProps = ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & ToggleVariants

/** shadcn/ui's ToggleGroupItem: toggleVariants from the group (or its own `variant` / `size`),
 *  the same classes, `className` merge, `asChild`. */
export const GoopToggleGroupItem = forwardRef<HTMLButtonElement, GoopToggleGroupItemProps>(function GoopToggleGroupItem(
  { className, variant = 'default', size = 'default', ...props },
  ref,
) {
  const group = useContext(GroupContext)
  const v = group?.variant || variant
  const s = group?.size || size
  const cue = useGoopCue('toggleGroupItem')
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      data-slot="toggle-group-item"
      data-variant={v ?? undefined}
      data-size={s ?? undefined}
      data-spacing={group?.spacing}
      className={cn(toggleVariants({ variant: v, size: s }), toggleGroupItemVariants(), group?.active && goopToggleItemFilled, className)}
      {...cue}
      {...props}
    />
  )
})
GoopToggleGroupItem.displayName = 'GoopToggleGroupItem'

'use client'
// GoopButtonGroup: shadcn/ui's ButtonGroup (a div role="group", `orientation`, `className`
// merge). Every GoopButton inside keeps its own goo body, exactly as when it stands alone; the
// group (core `attachButtonGroup` after hydration) marks each member's joined sides (`seams`)
// so core cuts that goo clean at the seams: no bulge, drip or splash crosses onto a
// neighbour, the seam never opens, and the outer edges bulge, drip and splash as usual.
// `press` / `tug` (the old whole-button squish and neighbour tug) are opt-in. Before mount,
// during SSR or with `goo={false}` (the buttons too) it is a plain shadcn ButtonGroup.
// Separator and Text are server-safe (./parts).
import { attachButtonGroup, type ButtonGroupHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useMemo, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { BUTTON_GROUP_PROP_KEYS, splitProps, toButtonGroupOptions, type GoopButtonGroupEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import { GoopButtonGroupContext } from './context'
import { buttonGroupVariants, type ButtonGroupVariants } from './variants'

export type GoopButtonGroupProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopButtonGroupEngineProps> &
  GoopButtonGroupEngineProps &
  ButtonGroupVariants & {
    /** Receives the live group handle (null before mount / when goo is off). */
    goopRef?: Ref<ButtonGroupHandle>
  }

export const GoopButtonGroup = forwardRef<HTMLDivElement, GoopButtonGroupProps>(function GoopButtonGroup(allProps, ref) {
  const [engine, props] = splitProps(allProps, BUTTON_GROUP_PROP_KEYS)
  const { className, orientation, goopRef, ...rest } = props
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const options = useStableValue(toButtonGroupOptions(engine, useGoopConfig(), orientation ?? 'horizontal'))
  const handle = useAttached(el, attachButtonGroup, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as ButtonGroupHandle, [handle])
  const context = useMemo(() => ({ goo: engine.goo !== false }), [engine.goo])
  return (
    <GoopButtonGroupContext.Provider value={context}>
      <div
        ref={composed}
        role="group"
        data-slot="button-group"
        data-orientation={orientation ?? undefined}
        data-goop-host={engine.goo !== false ? 'button-group' : undefined}
        className={cn(buttonGroupVariants({ orientation }), className)}
        {...rest}
      />
    </GoopButtonGroupContext.Provider>
  )
})
GoopButtonGroup.displayName = 'GoopButtonGroup'

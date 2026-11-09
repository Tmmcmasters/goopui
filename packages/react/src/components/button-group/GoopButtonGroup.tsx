'use client'
// GoopButtonGroup: shadcn/ui's ButtonGroup (a div role="group", `orientation`, `className`
// merge) as one goo body (core `attachButtonGroup` after hydration). One aria-hidden goo layer
// behind the buttons: the hover / focus `highlight` blob slides between them (trailing a low
// mound, swelling under the pointer; on touch only while pressed), and a press swells the goo
// past the pressed button (`bulge`) and sends it into the neighbours (`ripple`). The buttons
// flex too: the pressed one squishes (`press`), its neighbours are tugged toward it (`tug`),
// then a jelly settle. Joined edges only ever overlap, so no gap or seam opens, and nothing
// shifts layout. GoopButtons inside leave their own goo off unless they set `goo`. Before
// mount, during SSR or with `goo={false}` it is a plain shadcn ButtonGroup; reduced motion: a
// static highlight, no press motion. Separator and Text are server-safe (./parts).
import { attachButtonGroup, type ButtonGroupHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
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
  return (
    <GoopButtonGroupContext.Provider value>
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

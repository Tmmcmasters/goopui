'use client'
// GoopCard: shadcn/ui's Card (a div, `size`, `className` merge). Static by default. With
// `goo`, core's `attachCard` (after hydration) adds one aria-hidden svg behind the content and
// the edge nearest the pointer swells gently toward it in a low, wide mound (mouse / pen hover;
// no filter). Before mount, during SSR, with the goo off, or under reduced motion it is a plain
// shadcn Card. The parts (GoopCardHeader, ...) are server-safe (./parts).
import { attachCard, type CardHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { CARD_PROP_KEYS, splitProps, toCardOptions, type GoopCardEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { CARD, goopCardHost } from './styles'

export type GoopCardProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopCardEngineProps> &
  GoopCardEngineProps & {
    /** Same as shadcn: 'sm' tightens the spacing. */
    size?: 'default' | 'sm'
    /** Receives the live card handle (null before mount / when goo is off). */
    goopRef?: Ref<CardHandle>
  }

export const GoopCard = forwardRef<HTMLDivElement, GoopCardProps>(function GoopCard(allProps, ref) {
  const [engine, props] = splitProps(allProps, CARD_PROP_KEYS)
  const { className, size = 'default', goopRef, ...rest } = props
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const options = toCardOptions(engine, useGoopConfig())
  const handle = useAttached(el, attachCard, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as CardHandle, [handle])
  return (
    <div
      ref={composed}
      data-slot="card"
      data-size={size}
      data-goop-host={engine.goo ? 'card' : undefined}
      className={cn(CARD, engine.goo && goopCardHost, className)}
      {...rest}
    />
  )
})
GoopCard.displayName = 'GoopCard'

'use client'
// GoopButton: shadcn/ui's Button (same cva, `className` merge, `asChild` via Radix Slot) with
// the goo engine attached after mount. Every engine option is a prop (see goop-props.ts).
//
// Layering: core puts an aria-hidden goo layer at z-index -1 inside the host. Once it is
// attached the host's own background goes transparent (inline style) and the goo body paints
// the variant's color via --goop-color. Before mount, during SSR, or with `goo={false}` the
// button is a plain shadcn Button, so the server markup and hydration match exactly.
//
// `ref` is the DOM element (like shadcn, so Radix `asChild` triggers can focus it); the engine
// API (drip(), press(), handle, ...) comes through `goopRef`.
import type { GoopHandle, GoopOptions } from '@goopui/core'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import { forwardRef, useId, useImperativeHandle, useMemo, useRef, type ComponentPropsWithoutRef, type CSSProperties, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { GOOP_PROP_KEYS, splitProps, toGoopOptions, toGoopStyle, type GoopEngineProps, type GoopSoundProps } from '../../goop-props'
import { useGoopCue } from '../../sound'
import { seedFrom, useGoop } from '../../use-goop'
import { useComposedRefs, useIsomorphicLayoutEffect } from '../../utils'
import { useInGoopButtonGroup } from '../button-group/context'
import { buttonVariants, goopButtonGooVariants, goopButtonStyles, type ButtonSize, type ButtonVariant } from './variants'

/** What `goopRef` receives: the engine handle and its methods (mirrors the Vue expose). */
export interface GoopButtonApi {
  /** The live engine handle (null before mount / when goo is off). */
  readonly handle: GoopHandle | null
  /** The host element. */
  readonly el: HTMLElement | null
  /** Re-read `--goop-*` CSS vars (e.g. after changing them on an ancestor). */
  refresh(): void
  press(): void
  release(): void
  hover(on: boolean, x?: number): void
  drip(x?: number): void
  addGoop(amount?: number, x?: number): void
  shockwave(...args: Parameters<GoopHandle['shockwave']>): void
  splashThrough(x: number, y: number, vx: number, vy: number): void
  feedPointer(p: { clientX: number; clientY: number }): void
  inspect(): ReturnType<GoopHandle['inspect']> | null
}

export type GoopButtonProps = Omit<ComponentPropsWithoutRef<'button'>, keyof GoopEngineProps> &
  GoopEngineProps &
  GoopSoundProps & {
    variant?: ButtonVariant | null
    size?: ButtonSize | null
    /** Render the single child instead, merging classes, props and the goo onto it (Radix Slot). */
    asChild?: boolean
    /** Master switch. `false` renders a plain shadcn Button. Default: on, except `link` and
     *  inside a GoopButtonGroup (the group flexes its buttons). */
    goo?: boolean
    /** Receives the engine API (`drip()`, `press()`, `handle`, ...). */
    goopRef?: Ref<GoopButtonApi>
  }

export const GoopButton = forwardRef<HTMLButtonElement, GoopButtonProps>(function GoopButton(allProps, ref) {
  const [engine, props] = splitProps(allProps, GOOP_PROP_KEYS)
  const {
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    goo,
    sound,
    goopRef,
    disabled,
    style,
    children,
    ...rest
  } = props

  const el = useRef<HTMLButtonElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const id = useId()
  const cue = useGoopCue('button', { sound })

  const variantKey: ButtonVariant = variant ?? 'default'
  const gooStyle = goopButtonStyles[variantKey]
  // Inside a GoopButtonGroup the group flexes the buttons; their own goo stays off unless set.
  const grouped = useInGoopButtonGroup()
  const enabled = goo ?? (!grouped && gooStyle !== 'none')

  const options: GoopOptions = toGoopOptions(engine, {
    ...config,
    // Stable per instance (useId is SSR-safe), so resting drips differ between buttons that
    // share markup but never change across renders.
    seed: seedFrom(id),
    // The outline stroke's inner fill follows the body pose (--goop-x/y/skew/sx/sy).
    cssVars: gooStyle === 'stroke',
    disabled: !!disabled,
  })

  const { handle, active } = useGoop(el, options, enabled)

  // Variant/size changes swap --goop-* vars and the corner radius: have core re-read them.
  const first = useRef(true)
  useIsomorphicLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    handle?.update()
  }, [variantKey, size])

  useImperativeHandle(
    goopRef,
    (): GoopButtonApi => ({
      get handle() {
        return handle
      },
      get el() {
        return el.current
      },
      refresh: () => handle?.update(),
      press: () => handle?.press(),
      release: () => handle?.release(),
      hover: (on, x) => handle?.hover(on, x),
      drip: (x) => handle?.drip(x),
      addGoop: (amount, x) => handle?.addGoop(amount, x),
      shockwave: (...args) => handle?.shockwave(...args),
      splashThrough: (x, y, vx, vy) => handle?.splashThrough(x, y, vx, vy),
      feedPointer: (p) => handle?.feedPointer(p),
      inspect: () => handle?.inspect() ?? null,
    }),
    [handle],
  )

  const mergedStyle = useMemo(() => {
    const s: Record<string, string> = enabled ? toGoopStyle(engine) : {}
    if (active) {
      s.backgroundColor = 'transparent'
      if (gooStyle === 'stroke') s.borderColor = 'transparent'
    }
    return Object.keys(s).length || style ? ({ ...s, ...style } as CSSProperties) : undefined
  }, [enabled, active, gooStyle, style, engine.oilIntensity, engine.oilBandSize, engine.oilHueShift, engine.oilFollowPointer])

  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      ref={composed}
      data-slot="button"
      data-variant={variant ?? undefined}
      data-size={size ?? undefined}
      data-goop-host={enabled ? gooStyle : undefined}
      data-goop-active={active ? '' : undefined}
      disabled={disabled || undefined}
      className={cn(buttonVariants({ variant, size }), enabled && goopButtonGooVariants({ variant }), className)}
      style={mergedStyle}
      {...cue}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <span data-goop-label="" className="inline-flex items-center justify-center gap-[inherit]">
          {children}
        </span>
      )}
    </Comp>
  )
})
GoopButton.displayName = 'GoopButton'

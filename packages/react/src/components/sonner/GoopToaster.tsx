'use client'
// GoopToaster: shadcn/ui's Sonner (sonner's <Toaster> with shadcn's tokens, the same props
// passthrough, `className` merge, default `rounded-2xl` toasts and lucide icons; the `ref` is
// sonner's <section>). Keep calling `toast()` from sonner. After hydration core's
// `attachToaster` paints the toasts' backgrounds on one shared aria-hidden goo layer behind the
// real, unfiltered toasts (the same engine and markup as @goopui/vue's vue-sonner toaster):
//   dropIn  new toasts drop in from the toaster edge as a blob, overshoot and slosh;
//   merge   stacked toasts merge with fat goo necks that stretch and snap as the stack expands;
//   drips   leaving toasts drip off; swipe-out flings the goo the swipe's way.
// With `goo={false}`, during SSR and before hydration it is exactly shadcn's Sonner. Reduced
// motion: static goo bodies, none of the effects. sonner injects its own CSS.
import { attachToaster, playCue, toastCue, type ToasterHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react'
import { Toaster as Sonner, useSonner, type ToasterProps } from 'sonner'
import { useGoopConfig } from '../../config'
import { TOASTER_PROP_KEYS, splitProps, toToasterOptions, type GoopSoundProps, type GoopToasterProps } from '../../goop-props'
import { useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from './icons'

export type GoopToasterRootProps = Omit<ToasterProps, keyof GoopToasterProps> &
  GoopToasterProps &
  GoopSoundProps & {
    /** Receives the live toaster goo handle (null before mount / when goo is off). */
    goopRef?: Ref<ToasterHandle>
  }

/** shadcn's Sonner tokens (as @goopui/vue's GoopToaster). */
const TOKENS = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
  '--gray2': 'hsl(var(--popover) / 0.9)',
  '--gray3': 'var(--border)',
  '--gray4': 'var(--border)',
  '--gray5': 'var(--border)',
  '--gray12': 'var(--popover-foreground)',
} as CSSProperties

const ICONS: ToasterProps['icons'] = {
  success: <CircleCheckIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />,
  error: <OctagonXIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
  close: <XIcon className="size-4" />,
}

const TOAST_OPTIONS: ToasterProps['toastOptions'] = { classNames: { toast: 'rounded-2xl' } }

/** Each new toast (and each type change, e.g. a promise toast going loading -> success) plays
 *  the cue for what it reports, subtly. Mounted only while sound is on. */
function ToastSounds() {
  const { toasts } = useSonner()
  const played = useRef(new Map<string | number, string | undefined>())
  useEffect(() => {
    const live = new Set<string | number>()
    for (const t of toasts) {
      live.add(t.id)
      if (played.current.has(t.id) && played.current.get(t.id) === t.type) continue
      played.current.set(t.id, t.type)
      const cue = toastCue(t.type)
      if (cue) playCue(cue, { emphasis: 'subtle' })
    }
    for (const id of played.current.keys()) if (!live.has(id)) played.current.delete(id)
  }, [toasts])
  return null
}

export const GoopToaster = forwardRef<HTMLElement, GoopToasterRootProps>(function GoopToaster(allProps, ref) {
  const [engine, props] = splitProps(allProps, TOASTER_PROP_KEYS)
  const { className, style, toastOptions, icons, sound, goopRef, ...rest } = props
  const config = useGoopConfig()
  const el = useRef<HTMLElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useAttached(el, attachToaster, toToasterOptions(engine, config), engine.goo !== false)
  useImperativeHandle(goopRef, () => handle as ToasterHandle, [handle])
  const on = useGoopSound(sound)

  return (
    <>
      <Sonner
        ref={composed}
        className={cn('toaster group', className)}
        style={{ ...TOKENS, ...style }}
        icons={{ ...ICONS, ...icons }}
        toastOptions={toastOptions ?? TOAST_OPTIONS}
        {...rest}
      />
      {on ? <ToastSounds /> : null}
    </>
  )
})
GoopToaster.displayName = 'GoopToaster'

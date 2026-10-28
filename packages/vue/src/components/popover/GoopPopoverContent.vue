<script setup lang="ts">
// GoopPopoverContent: shadcn-vue's PopoverContent (reka-ui PopoverContent in a portal, same
// props/emits, `class` merge, align center / sideOffset 4) whose panel oozes out of the
// trigger. Core's `attachEmerge` draws the panel's background as goo on an aria-hidden
// surface behind the real, unfiltered content: a bulb swells from the trigger edge facing
// `side`, the panel inflates out of it, the neck stretches and snaps; close sucks it back.
// Momentum (openSlosh / openDrips / closeSlosh): the far edge sloshes and sheds drops on
// open, the near edge sloshes against the trigger on close.
//
// The panel's shadcn background, ring and shadow move onto the goo (`--goop-color`, a
// drop-shadow on the surface). `surface` picks the color: by default the whole emerged surface
// (panel, bridge, drops) takes the trigger's background and the content its text color (core
// resolves it on every open, falling back to the theme's primary when the trigger has no
// background of its own); goop.css retints the popover / muted / border / accent tokens inside. Content opacity follows `--goop-emerge-content`, and a hold
// animation (goop.css) keeps reka's Presence mounted while the close plays. With
// `:goo="false"` it is exactly shadcn's PopoverContent. Reduced motion: plain open/close.
import {
  attachEmerge,
  type EmergeHandle,
  type EmergeOptions,
  type EmergeSurfaceColor,
  type GoopPreset,
  type GoopRendererOption,
} from '@goopui/core'
import { cn } from 'cn'
import type { PopoverContentEmits, PopoverContentProps } from 'reka-ui'
import { PopoverContent, PopoverPortal, injectPopoverRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { injectGoopPopover } from './context'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<
    PopoverContentProps & {
      class?: HTMLAttributes['class']
      /** Master switch. `false` renders a plain shadcn PopoverContent. */
      goo?: boolean
      /** Bulb + lumpy neck between trigger and panel. */
      bridge?: boolean
      /** Jelly overshoot and wobble. */
      wobble?: boolean
      /** Momentum launch away from the trigger that stretches and snaps the neck. */
      momentum?: boolean
      /** Content fades in once the goo settles. */
      fade?: boolean
      /** Open: the far edge bulges past rest, rebounds and wobbles. `true`, `false` or a 0..2 strength. */
      openSlosh?: boolean | number
      /** Open: the whole far edge bursts (globs, drops, specks fling off, fall and fade). `true`, `false` or 0..2. */
      openDrips?: boolean | number
      /** Burst drop count scale (0..3, default 1). */
      openDripAmount?: number
      /** Burst drop size scale (0.3..2.5, default 1). */
      openDripSize?: number
      /** How far burst drops are flung (0..3, default 1). */
      openDripFling?: number
      /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
      openDripVariety?: number
      /** Close: the goo lags and the near edge sloshes against the trigger. `true`, `false` or 0..2. */
      closeSlosh?: boolean | number
      /** Panel color: 'trigger' (default: the trigger's background and text color, theme
       *  primary when the trigger has none), 'popover' (shadcn's popover tokens), or a CSS color. */
      surface?: EmergeSurfaceColor
      /** Animation speed multiplier. */
      speed?: number
      /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
      preset?: GoopPreset
      /** 'svg' (default) | 'canvas' | a custom renderer factory. */
      renderer?: GoopRendererOption
    }
  >(),
  {
    align: 'center',
    sideOffset: 4,
    goo: true,
    bridge: true,
    wobble: true,
    momentum: true,
    fade: true,
    openSlosh: true,
    openDrips: true,
    openDripAmount: undefined,
    openDripSize: undefined,
    openDripFling: undefined,
    openDripVariety: undefined,
    closeSlosh: true,
    surface: 'trigger',
    speed: 1,
    preset: undefined,
    renderer: undefined,
  },
)
const emits = defineEmits<PopoverContentEmits>()

const delegated = computed(() => {
  const {
    class: _class,
    goo: _goo,
    bridge: _bridge,
    wobble: _wobble,
    momentum: _momentum,
    fade: _fade,
    openSlosh: _openSlosh,
    openDrips: _openDrips,
    openDripAmount: _openDripAmount,
    openDripSize: _openDripSize,
    openDripFling: _openDripFling,
    openDripVariety: _openDripVariety,
    closeSlosh: _closeSlosh,
    surface: _surface,
    speed: _speed,
    preset: _preset,
    renderer: _renderer,
    ...rest
  } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectPopoverRootContext()
const goopCtx = injectGoopPopover()
const config = useGoopConfig()
const surface = useTemplateRef<HTMLElement>('surface')
const handle = shallowRef<EmergeHandle | null>(null)

const SHADCN =
  'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 flex flex-col gap-2.5 rounded-lg p-2.5 text-sm shadow-md ring-1 duration-100 z-50 w-72 max-w-(--reka-popover-content-available-width) origin-(--reka-popover-content-transform-origin) outline-hidden'
// The goo paints the background (popover color), ring and shadow; no CSS enter/exit.
const GOO =
  'text-popover-foreground [--goop-color:var(--popover)] flex flex-col gap-2.5 rounded-lg p-2.5 text-sm z-50 w-72 max-w-(--reka-popover-content-available-width) outline-hidden'

const classes = computed(() => cn(props.goo ? GOO : SHADCN, props.class))

const options = computed<EmergeOptions>(() => ({
  bridge: props.bridge,
  wobble: props.wobble,
  momentum: props.momentum,
  fade: props.fade,
  openSlosh: props.openSlosh,
  openDrips: props.openDrips,
  openDripAmount: props.openDripAmount,
  openDripSize: props.openDripSize,
  openDripFling: props.openDripFling,
  openDripVariety: props.openDripVariety,
  closeSlosh: props.closeSlosh,
  surfaceColor: props.surface,
  speed: props.speed,
  preset: props.preset ?? config.preset,
  renderer: props.renderer ?? config.renderer,
  reducedMotion: config.reducedMotion,
}))

/** The element the goo emerges from (and takes its color from). */
const anchorEl = () => goopCtx?.anchor.value ?? root.triggerElement.value ?? null

/** reka parks the floating wrapper at translate(0, -200%) until floating-ui has placed it. */
const positioned = (host: HTMLElement) => {
  const wrap = host.parentElement
  return !wrap?.hasAttribute('data-reka-popper-content-wrapper') || !wrap.style.transform.includes('-200%')
}

const attach = () => {
  const el = surface.value
  const host = el?.parentElement
  if (!el || !host) return
  if (handle.value) detach()
  handle.value = attachEmerge(host, { ...options.value, surface: el, anchor: anchorEl, ready: () => positioned(host) })
  if (root.open.value) handle.value.open()
}
const detach = () => {
  handle.value?.destroy()
  handle.value = null
}

// The content element mounts on every open (reka's Presence, often via a deferred teleport),
// and the surface only exists while `goo` is on: attach whenever it appears.
watch(surface, (el) => (el ? attach() : detach()), { flush: 'post' })
onBeforeUnmount(detach)
watch(options, (next) => handle.value?.update(next), { flush: 'post' })
// Before render, so the hold animation picks up the close duration as data-state flips.
watch(
  () => root.open.value,
  (open) => {
    if (open) handle.value?.open()
    else handle.value?.close()
  },
)

defineExpose({
  /** The live emerge handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      data-slot="popover-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="classes"
    >
      <span
        v-if="goo"
        ref="surface"
        data-goop="surface"
        aria-hidden="true"
        style="position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit"
      />
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>

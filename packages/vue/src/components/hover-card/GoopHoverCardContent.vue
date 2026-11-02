<script setup lang="ts">
// GoopHoverCardContent: shadcn-vue's HoverCardContent (reka-ui HoverCardContent in a portal,
// same props/emits, `class` merge, align center / sideOffset 4) drawn with GoopPopoverContent's
// emerge engine. By default it blooms from the side facing its trigger (`bloomFrom:
// 'trigger'`: the puddle starts on the card's edge in line with the trigger, spreads with a
// lobed edge, overshoots, splashes drops all around that keep off the trigger, and shrinks back
// into that edge on close). `bloomFrom="center"`: from the card's center, like the popover;
// `flowStyle="neck"` / `:flow="false"`: the popover's neck / bulb emerges.
//
// The card's shadcn background, ring and shadow move onto the goo. `surface` defaults to
// 'popover' (a hover card's trigger is usually a link with no background). Content opacity
// follows `--goop-emerge-content`, and goop.css's hold animation keeps reka's Presence mounted
// while the close plays. With `:goo="false"` it is exactly shadcn's HoverCardContent. Reduced
// motion: plain open/close.
import { attachEmerge, type EmergeHandle } from '@goopui/core'
import { cn } from 'cn'
import type { HoverCardContentProps } from 'reka-ui'
import { HoverCardContent, HoverCardPortal, injectHoverCardRootContext, useForwardProps } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { HOVER_CARD_PROP_KEYS, toHoverCardOptions, type GoopHoverCardProps } from '../../goop-props'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<HoverCardContentProps & GoopHoverCardProps & { class?: HTMLAttributes['class'] }>(), {
  align: 'center',
  sideOffset: 4,
  goo: true,
  flow: undefined,
  flowStyle: undefined,
  bloomStart: undefined,
  bloomFrom: undefined,
  bridge: undefined,
  wobble: undefined,
  momentum: undefined,
  fade: undefined,
  openSlosh: undefined,
  openDrips: undefined,
  openDripAmount: undefined,
  openDripSize: undefined,
  openDripFling: undefined,
  openDripVariety: undefined,
  sloshVariety: undefined,
  closeSlosh: undefined,
  surface: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})

const OWN = new Set<string>(['class', ...HOVER_CARD_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as HoverCardContentProps)
const forwarded = useForwardProps(delegated)

const root = injectHoverCardRootContext()
const config = useGoopConfig()
const surface = useTemplateRef<HTMLElement>('surface')
const handle = shallowRef<EmergeHandle | null>(null)

const SHADCN =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground w-64 rounded-lg p-2.5 text-sm shadow-md ring-1 duration-100 z-50 origin-(--reka-hover-card-content-transform-origin) outline-hidden'
// The goo paints the background (popover color), ring and shadow; no CSS enter/exit.
const GOO = 'text-popover-foreground [--goop-color:var(--popover)] w-64 rounded-lg p-2.5 text-sm z-50 outline-hidden'

const classes = computed(() => cn(props.goo ? GOO : SHADCN, props.class))
const options = computed(() => toHoverCardOptions(props, config))

const triggerEl = () => root.triggerElement.value ?? null

/** reka parks the floating wrapper at translate(0, -200%) until floating-ui has placed it. */
const positioned = (host: HTMLElement) => {
  const wrap = host.parentElement
  return !wrap?.hasAttribute('data-reka-popper-content-wrapper') || !wrap.style.transform.includes('-200%')
}

const detach = () => {
  handle.value?.destroy()
  handle.value = null
}
const attach = () => {
  const el = surface.value
  const host = el?.parentElement
  if (!el || !host) return
  if (handle.value) detach()
  handle.value = attachEmerge(host, {
    ...options.value,
    surface: el,
    anchor: triggerEl,
    ready: () => positioned(host),
    bloomOrigin: () => (props.bloomFrom === 'center' ? null : triggerEl()),
  })
  if (root.open.value) handle.value.open()
}

// The content mounts on every open (reka's Presence), and the surface only exists while `goo`
// is on: attach whenever it appears.
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
  <HoverCardPortal>
    <HoverCardContent
      data-slot="hover-card-content"
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
    </HoverCardContent>
  </HoverCardPortal>
</template>

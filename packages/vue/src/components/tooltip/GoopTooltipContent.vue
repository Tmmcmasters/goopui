<script setup lang="ts">
// GoopTooltipContent: shadcn-vue's TooltipContent (reka-ui TooltipContent in a portal, same
// props/emits, `class` merge, sideOffset 0, arrow) drawn with the popover's emerge engine
// scaled down (core TOOLTIP_FEEL). By default it blooms like GoopPopoverContent: it pools from
// its own center, spreads with a lobed edge, overshoots and settles, sheds a light splash (a
// few small drops, core TOOLTIP_BLOOM_SPLASH; `openDrips` / `openDrip*` turn it up or off)
// and shrinks back to the center on close. `:flow="false"`: the original quick emerge out of
// a small bulb at the trigger edge (no drips by default). The arrow fades in with the content.
//
// The tooltip's shadcn background moves onto the goo (`--goop-color: var(--foreground)`).
// `surface` defaults to 'popover' (shadcn's inverted tooltip, unlike the popover's 'trigger'
// default): a tooltip is a label, not an extension of its trigger. 'trigger' or a CSS color
// retint the goo, text and arrow through core's --goop-surface / --goop-surface-foreground.
// Content opacity follows `--goop-emerge-content`, and goop.css's hold animation keeps reka's
// Presence mounted while the close plays. With `:goo="false"` it is exactly shadcn's
// TooltipContent. Reduced motion: plain open/close.
import { attachEmerge, type EmergeHandle } from '@goopui/core'
import { cn } from 'cn'
import type { TooltipContentEmits, TooltipContentProps } from 'reka-ui'
import { TooltipArrow, TooltipContent, TooltipPortal, injectTooltipRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { TOOLTIP_PROP_KEYS, toTooltipOptions, type GoopTooltipProps } from '../../goop-props'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<TooltipContentProps & GoopTooltipProps & { class?: HTMLAttributes['class'] }>(), {
  sideOffset: 0,
  goo: true,
  flow: undefined,
  flowStyle: undefined,
  bloomStart: undefined,
  bridge: undefined,
  wobble: undefined,
  momentum: undefined,
  fade: undefined,
  openSlosh: undefined,
  openDrips: undefined,
  closeSlosh: undefined,
  openDripAmount: undefined,
  openDripSize: undefined,
  openDripFling: undefined,
  openDripVariety: undefined,
  surface: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
const emits = defineEmits<TooltipContentEmits>()

const OWN = new Set<string>(['class', ...TOOLTIP_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as TooltipContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectTooltipRootContext()
const config = useGoopConfig()
const surface = useTemplateRef<HTMLElement>('surface')
const handle = shallowRef<EmergeHandle | null>(null)

const SHADCN =
  'data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm bg-foreground text-background z-50 w-fit max-w-xs origin-(--reka-tooltip-content-transform-origin)'
// The goo paints the background (foreground color); no CSS enter/exit.
const GOO =
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm [--goop-color:var(--foreground)] text-background data-goop-tint:[--goop-color:var(--goop-surface)] data-goop-tint:text-(--goop-surface-foreground) z-50 w-fit max-w-xs'
const ARROW = 'size-2.5 rotate-45 rounded-xs bg-foreground fill-foreground z-50 translate-y-[calc(-50%_-_2px)]'
// Goo on: the arrow follows the resolved surface color.
const GOO_ARROW =
  'size-2.5 rotate-45 rounded-xs bg-(--goop-surface,var(--foreground)) fill-(--goop-surface,var(--foreground)) z-50 translate-y-[calc(-50%_-_2px)]'

const classes = computed(() => cn(props.goo ? GOO : SHADCN, props.class))
const options = computed(() => toTooltipOptions(props, config))

// The trigger element itself, so a `surface: 'trigger'` can read its colors.
const anchorEl = () => root.trigger.value ?? null

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
  handle.value = attachEmerge(host, { ...options.value, surface: el, anchor: anchorEl, ready: () => positioned(host) })
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
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="classes"
    >
      <span
        v-if="goo"
        ref="surface"
        data-goop="surface"
        aria-hidden="true"
        style="position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit"
      />
      <!-- Goo on: the label sits in an element so it fades with --goop-emerge-content (goop.css
           only reaches element children; bare text would show at once, clipped by the goo). -->
      <span v-if="goo" data-goop="label" class="inline-flex items-center gap-[inherit]"><slot /></span>
      <slot v-else />

      <TooltipArrow :class="goo ? GOO_ARROW : ARROW" />
    </TooltipContent>
  </TooltipPortal>
</template>

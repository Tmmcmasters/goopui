<script setup lang="ts">
// GoopSheetContent: shadcn-vue's SheetContent (reka-ui DialogContent + overlay in a portal,
// same props/emits, `side` top | right | bottom | left, `class` merge, close button) whose
// panel oozes in from its edge as thick liquid. Core's `attachSheet` draws the sheet's
// background as goo on an aria-hidden surface behind the real, unfiltered content: the
// leading edge is a lobed, rippling goo front that runs out with momentum, overshoots and
// sloshes when it stops; top sheets grow drips that hang off the front and sway, bottom
// sheets fling a few drops up that fall back in. Close: a small outward bulge, then the goo
// is sucked back into the edge. Toggles: `lobes`, `slosh`, `drips`, `suck`, `fade`.
//
// The sheet's shadcn background, border and shadow move onto the goo (`--goop-color:
// var(--background)`, a drop-shadow on the surface). Content opacity follows
// `--goop-sheet-content`, and goop.css's hold animation keeps reka's Presence mounted while
// the close plays (the overlay fades over the same time). Canvas renderer by default (a big
// surface). With `:goo="false"` it is exactly shadcn's SheetContent. Reduced motion: plain
// open/close, no goo motion.
import { attachSheet, type SheetHandle } from '@goopui/core'
import { cn } from 'cn'
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, injectDialogRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { SHEET_PROP_KEYS, toSheetOptions, type GoopSheetProps } from '../../goop-props'

defineOptions({
  inheritAttrs: false,
})

type Side = 'top' | 'right' | 'bottom' | 'left'

const props = withDefaults(
  defineProps<
    DialogContentProps &
      GoopSheetProps & {
        class?: HTMLAttributes['class']
        /** Edge the sheet comes in from. */
        side?: Side
        /** Show the X close button in the top-right corner. */
        showCloseButton?: boolean
      }
  >(),
  {
    side: 'right',
    showCloseButton: true,
    goo: true,
    lobes: undefined,
    slosh: undefined,
    drips: undefined,
    suck: undefined,
    fade: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
  },
)
const emits = defineEmits<DialogContentEmits>()

const OWN = new Set<string>(['class', 'side', 'showCloseButton', ...SHEET_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as DialogContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectDialogRootContext()
const config = useGoopConfig()
const surface = useTemplateRef<HTMLElement>('surface')
const handle = shallowRef<SheetHandle | null>(null)
const closeMs = ref(0)

const OVERLAY =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50'
const BASE = 'fixed z-50 flex flex-col gap-4 text-sm outline-none'
const SHADCN_BASE = 'bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500'
const SIDES: Record<Side, string> = {
  right: 'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm',
  left: 'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm',
  top: 'inset-x-0 top-0 h-auto',
  bottom: 'inset-x-0 bottom-0 h-auto',
}
const SHADCN_SIDES: Record<Side, string> = {
  right: 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right border-l',
  left: 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left border-r',
  top: 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top border-b',
  bottom: 'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom border-t',
}
// The goo paints the background, border and shadow; no CSS slide.
const GOO = 'text-foreground [--goop-color:var(--background)]'

const classes = computed(() =>
  cn(BASE, SIDES[props.side], props.goo ? GOO : [SHADCN_BASE, SHADCN_SIDES[props.side]], props.class),
)
const options = computed(() => toSheetOptions(props, config))
// Goo on: the overlay fades over the goo's close so the backdrop doesn't vanish first.
const overlayStyle = computed(() => (props.goo && closeMs.value > 0 ? { animationDuration: `${closeMs.value}ms` } : undefined))

const attach = () => {
  const el = surface.value
  const host = el?.parentElement
  if (!el || !host) return
  if (handle.value) detach()
  handle.value = attachSheet(host, { ...options.value, surface: el, side: () => props.side })
  closeMs.value = handle.value.closeDuration
  if (root.open.value) handle.value.open()
}
const detach = () => {
  handle.value?.destroy()
  handle.value = null
}

// The content mounts on every open (reka's Presence), and the surface only exists while
// `goo` is on: attach whenever it appears.
watch(surface, (el) => (el ? attach() : detach()), { flush: 'post' })
onBeforeUnmount(detach)
watch(
  options,
  (next) => {
    handle.value?.update(next)
    if (handle.value) closeMs.value = handle.value.closeDuration
  },
  { flush: 'post' },
)
watch(
  () => props.side,
  () => handle.value?.refresh(),
  { flush: 'post' },
)
// Before render, so the hold animation picks up the close duration as data-state flips.
watch(
  () => root.open.value,
  (open) => {
    if (open) handle.value?.open()
    else handle.value?.close()
  },
)

defineExpose({
  /** The live sheet handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      data-slot="sheet-overlay"
      :class="OVERLAY"
      :style="overlayStyle"
    />
    <DialogContent
      data-slot="sheet-content"
      :data-side="side"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="classes"
    >
      <span
        v-if="goo"
        ref="surface"
        data-goop="surface"
        aria-hidden="true"
        style="position: absolute; inset: 0; z-index: -1; pointer-events: none"
      />
      <slot />
      <DialogClose
        v-if="showCloseButton"
        data-slot="sheet-close"
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>

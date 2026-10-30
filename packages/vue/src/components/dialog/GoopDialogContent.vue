<script setup lang="ts">
// GoopDialogContent: shadcn-vue's DialogContent (reka-ui DialogContent in a portal over a
// DialogOverlay, same props/emits, `class` merge, a close button unless `showCloseButton` is
// false) whose panel blooms like GoopPopoverContent, but detached: a dialog has no trigger to
// grow from, so it pools from its own center, spreads with a lobed edge, overshoots every
// side and splashes all around (the big splash); close pulls in, wobbles and shrinks back to
// the center (core `attachEmerge`, `detached: true`, DIALOG_FEEL). The overlay pours down as a
// goo sheet and drains off on close (GoopDialogOverlay; `:overlay="false"` for shadcn's fade).
//
// The panel's shadcn background and shadow move onto the goo (`--goop-color:
// var(--background)`). Content opacity follows `--goop-emerge-content`, and goop.css's hold
// animation keeps reka's Presence mounted while the close plays. With `:goo="false"` it is
// exactly shadcn's DialogContent and overlay. Reduced motion: plain open/close.
import { cn } from 'cn'
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { DialogClose, DialogContent, DialogPortal, injectDialogRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { DIALOG_PROP_KEYS, toDialogOptions, type GoopDialogProps } from '../../goop-props'
import GoopDialogOverlay from './GoopDialogOverlay.vue'
import { useDialogPanel } from './use-dialog-goo'
import { DIALOG_CLOSE, DIALOG_CONTENT_GOO, DIALOG_CONTENT_SHADCN } from './styles'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<
    DialogContentProps &
      GoopDialogProps & {
        class?: HTMLAttributes['class']
        /** Render the corner close (X) button. */
        showCloseButton?: boolean
      }
  >(),
  {
    showCloseButton: true,
    goo: true,
    bloomStart: undefined,
    wobble: undefined,
    fade: undefined,
    openSlosh: undefined,
    openDrips: undefined,
    closeSlosh: undefined,
    openDripAmount: undefined,
    openDripSize: undefined,
    openDripFling: undefined,
    openDripVariety: undefined,
    sloshVariety: undefined,
    overlay: undefined,
    overlayDrips: undefined,
    surface: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
  },
)
const emits = defineEmits<DialogContentEmits>()

const OWN = new Set<string>(['class', 'showCloseButton', ...DIALOG_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as DialogContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectDialogRootContext()
const config = useGoopConfig()
const surface = useTemplateRef<HTMLElement>('surface')

const classes = computed(() => cn(props.goo ? DIALOG_CONTENT_GOO : DIALOG_CONTENT_SHADCN, props.class))
const options = computed(() => toDialogOptions(props, config, 'dialog'))

const handle = useDialogPanel(
  surface,
  () => options.value,
  () => root.open.value,
  () => root.triggerElement.value ?? null,
)

defineExpose({
  /** The live emerge handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <DialogPortal>
    <GoopDialogOverlay
      :goo="goo && overlay === true"
      :drips="overlayDrips"
      :speed="speed"
      :preset="preset"
      :renderer="renderer"
    />
    <DialogContent
      data-slot="dialog-content"
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
      <DialogClose
        v-if="showCloseButton"
        data-slot="dialog-close"
        :class="DIALOG_CLOSE"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
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

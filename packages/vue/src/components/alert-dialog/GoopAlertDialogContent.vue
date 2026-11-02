<script setup lang="ts">
// GoopAlertDialogContent: shadcn-vue's AlertDialogContent (reka-ui AlertDialogContent in a
// portal over an overlay, same props/emits, `class` merge). The panel blooms from its own
// center like GoopDialogContent, but an alert is the serious one: a lighter splash (a few
// small drops, core ALERT_DIALOG_SPLASH) and a lighter slosh (ALERT_DIALOG_MOMENTUM); every
// toggle and knob still turns it up or off. The overlay is shadcn's fade; `:overlay="true"`
// opts into the goo sheet that pours down. `:goo="false"`: exactly shadcn's AlertDialogContent.
// Reduced motion: plain open/close.
import { cn } from 'cn'
import type { AlertDialogContentEmits, AlertDialogContentProps } from 'reka-ui'
import { AlertDialogContent, AlertDialogPortal, injectDialogRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { DIALOG_PROP_KEYS, toDialogOptions, type GoopDialogProps } from '../../goop-props'
import { DIALOG_CONTENT_GOO, DIALOG_CONTENT_SHADCN } from '../dialog/styles'
import { useDialogPanel } from '../dialog/use-dialog-goo'
import GoopAlertDialogOverlay from './GoopAlertDialogOverlay.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<AlertDialogContentProps & GoopDialogProps & { class?: HTMLAttributes['class'] }>(), {
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
})
const emits = defineEmits<AlertDialogContentEmits>()

const OWN = new Set<string>(['class', ...DIALOG_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as AlertDialogContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

// AlertDialogRoot is a DialogRoot underneath.
const root = injectDialogRootContext()
const config = useGoopConfig()
const surface = useTemplateRef<HTMLElement>('surface')

const classes = computed(() => cn(props.goo ? DIALOG_CONTENT_GOO : DIALOG_CONTENT_SHADCN, props.class))
const options = computed(() => toDialogOptions(props, config, 'alert'))

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
  <AlertDialogPortal>
    <GoopAlertDialogOverlay
      :goo="goo && overlay === true"
      :drips="overlayDrips"
      :speed="speed"
      :preset="preset"
      :renderer="renderer"
    />
    <AlertDialogContent
      data-slot="alert-dialog-content"
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
    </AlertDialogContent>
  </AlertDialogPortal>
</template>

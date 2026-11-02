<script setup lang="ts">
// GoopDialogOverlay: shadcn-vue's DialogOverlay (reka-ui DialogOverlay, `class` merge). With
// goo on, the dimmed backdrop is a goo sheet (core `attachBackdrop`) that pours down over the
// page with a drippy leading edge and drains off the bottom on close; goop.css's hold
// animation keeps reka's Presence mounted while it drains. Color and dim come from
// `--goop-backdrop-color` (default black) and `--goop-backdrop-opacity` (default 0.5).
// `:goo="false"`: exactly shadcn's fading overlay. Reduced motion: no pour, instant.
// GoopDialogContent renders one for you; use this directly only in a custom portal.
import type { DialogOverlayProps } from 'reka-ui'
import { DialogOverlay, injectDialogRootContext } from 'reka-ui'
import { cn } from 'cn'
import { computed, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { toBackdropOptions, type GoopDialogProps } from '../../goop-props'
import { useDialogBackdrop } from './use-dialog-goo'

const props = withDefaults(
  defineProps<
    DialogOverlayProps & {
      class?: HTMLAttributes['class']
      /** Goo pour (opt-in). Default `false`: shadcn's fading overlay. */
      goo?: boolean
      /** Drippy leading edge: `true`, `false` (a straight edge) or a 0..2 strength. */
      drips?: GoopDialogProps['overlayDrips']
      speed?: number
      preset?: GoopDialogProps['preset']
      renderer?: GoopDialogProps['renderer']
    }
  >(),
  { goo: false, drips: undefined, speed: undefined, preset: undefined, renderer: undefined },
)

const delegated = computed(() => {
  const { class: _c, goo: _g, drips: _d, speed: _s, preset: _p, renderer: _r, ...rest } = props
  return rest
})

const root = injectDialogRootContext()
const config = useGoopConfig()
const surface = useTemplateRef<HTMLElement>('surface')

const SHADCN =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50'
// The goo paints the dim; no CSS enter/exit.
const GOO = 'fixed inset-0 z-50'

const options = () =>
  toBackdropOptions({ goo: props.goo, overlayDrips: props.drips, speed: props.speed, preset: props.preset, renderer: props.renderer }, config)

const handle = useDialogBackdrop(surface, options, () => root.open.value)

defineExpose({
  /** The live backdrop handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <DialogOverlay
    data-slot="dialog-overlay"
    v-bind="delegated"
    :class="cn(goo ? GOO : SHADCN, props.class)"
  >
    <span
      v-if="goo"
      ref="surface"
      data-goop="surface"
      aria-hidden="true"
      style="position: absolute; inset: 0; z-index: -1; pointer-events: none"
    />
  </DialogOverlay>
</template>

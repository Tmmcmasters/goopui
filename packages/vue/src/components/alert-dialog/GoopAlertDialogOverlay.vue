<script setup lang="ts">
// GoopAlertDialogOverlay: shadcn-vue's AlertDialogOverlay, drawn by GoopDialogOverlay (the goo
// sheet pours down and drains off; `:goo="false"` for shadcn's fade). GoopAlertDialogContent
// renders one for you.
import type { AlertDialogOverlayProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { GoopDialogProps } from '../../goop-props'
import GoopDialogOverlay from '../dialog/GoopDialogOverlay.vue'

const props = withDefaults(
  defineProps<
    AlertDialogOverlayProps & {
      class?: HTMLAttributes['class']
      goo?: boolean
      drips?: GoopDialogProps['overlayDrips']
      speed?: number
      preset?: GoopDialogProps['preset']
      renderer?: GoopDialogProps['renderer']
    }
  >(),
  { goo: true, drips: undefined, speed: undefined, preset: undefined, renderer: undefined },
)
</script>

<template>
  <GoopDialogOverlay
    data-slot="alert-dialog-overlay"
    v-bind="props"
  />
</template>

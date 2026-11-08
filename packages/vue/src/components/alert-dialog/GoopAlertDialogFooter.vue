<script setup lang="ts">
// GoopAlertDialogFooter: shadcn-vue's AlertDialogFooter.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ALERT_DIALOG_FOOTER } from '../dialog/styles'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="alert-dialog-footer"
    :class="cn(ALERT_DIALOG_FOOTER, props.class)"
  >
    <slot />
  </div>
</template>

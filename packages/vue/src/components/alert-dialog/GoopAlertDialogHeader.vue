<script setup lang="ts">
// GoopAlertDialogHeader: shadcn-vue's AlertDialogHeader.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { DIALOG_HEADER } from '../dialog/styles'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="alert-dialog-header"
    :class="cn(DIALOG_HEADER, props.class)"
  >
    <slot />
  </div>
</template>

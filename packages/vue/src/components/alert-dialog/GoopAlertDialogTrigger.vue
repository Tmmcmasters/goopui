<script setup lang="ts">
// GoopAlertDialogTrigger: shadcn-vue's AlertDialogTrigger.
import type { AlertDialogTriggerProps } from 'reka-ui'
import { AlertDialogTrigger } from 'reka-ui'

const props = defineProps<AlertDialogTriggerProps>()
</script>

<template>
  <AlertDialogTrigger
    data-slot="alert-dialog-trigger"
    v-bind="props"
  >
    <slot />
  </AlertDialogTrigger>
</template>

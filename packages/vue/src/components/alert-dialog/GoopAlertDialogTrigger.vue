<script setup lang="ts">
// GoopAlertDialogTrigger: shadcn-vue's AlertDialogTrigger.
import type { AlertDialogTriggerProps } from 'reka-ui'
import { AlertDialogTrigger } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<AlertDialogTriggerProps>()
const cue = useGoopCue('dialogTrigger', { claim: true })
</script>

<template>
  <AlertDialogTrigger
    data-slot="alert-dialog-trigger"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </AlertDialogTrigger>
</template>

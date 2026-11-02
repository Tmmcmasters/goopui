<script setup lang="ts">
// GoopAlertDialogDescription: shadcn-vue's AlertDialogDescription.
import { cn } from 'cn'
import type { AlertDialogDescriptionProps } from 'reka-ui'
import { AlertDialogDescription } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { DIALOG_DESCRIPTION } from '../dialog/styles'

const props = defineProps<AlertDialogDescriptionProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <AlertDialogDescription
    data-slot="alert-dialog-description"
    v-bind="delegated"
    :class="cn(DIALOG_DESCRIPTION, props.class)"
  >
    <slot />
  </AlertDialogDescription>
</template>

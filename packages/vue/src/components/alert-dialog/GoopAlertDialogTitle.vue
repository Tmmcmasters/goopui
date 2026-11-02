<script setup lang="ts">
// GoopAlertDialogTitle: shadcn-vue's AlertDialogTitle.
import { cn } from 'cn'
import type { AlertDialogTitleProps } from 'reka-ui'
import { AlertDialogTitle } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { DIALOG_TITLE } from '../dialog/styles'

const props = defineProps<AlertDialogTitleProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <AlertDialogTitle
    data-slot="alert-dialog-title"
    v-bind="delegated"
    :class="cn(DIALOG_TITLE, props.class)"
  >
    <slot />
  </AlertDialogTitle>
</template>

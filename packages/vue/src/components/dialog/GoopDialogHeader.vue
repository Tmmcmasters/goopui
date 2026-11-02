<script setup lang="ts">
// GoopDialogHeader: shadcn-vue's DialogHeader.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { DIALOG_HEADER } from './styles'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="dialog-header"
    :class="cn(DIALOG_HEADER, props.class)"
  >
    <slot />
  </div>
</template>

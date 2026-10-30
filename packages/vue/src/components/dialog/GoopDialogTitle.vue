<script setup lang="ts">
// GoopDialogTitle: shadcn-vue's DialogTitle.
import { cn } from 'cn'
import type { DialogTitleProps } from 'reka-ui'
import { DialogTitle, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { DIALOG_TITLE } from './styles'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <DialogTitle
    data-slot="dialog-title"
    v-bind="forwarded"
    :class="cn(DIALOG_TITLE, props.class)"
  >
    <slot />
  </DialogTitle>
</template>

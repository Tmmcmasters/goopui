<script setup lang="ts">
// GoopDialogDescription: shadcn-vue's DialogDescription.
import { cn } from 'cn'
import type { DialogDescriptionProps } from 'reka-ui'
import { DialogDescription, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { DIALOG_DESCRIPTION } from './styles'

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <DialogDescription
    data-slot="dialog-description"
    v-bind="forwarded"
    :class="cn(DIALOG_DESCRIPTION, props.class)"
  >
    <slot />
  </DialogDescription>
</template>

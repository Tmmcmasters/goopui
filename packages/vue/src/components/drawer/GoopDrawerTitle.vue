<script setup lang="ts">
// GoopDrawerTitle: shadcn-vue's DrawerTitle (reka-ui's DialogTitle).
import type { DialogTitleProps } from 'reka-ui'
import { cn } from 'cn'
import { DialogTitle } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DialogTitle
    data-slot="drawer-title"
    v-bind="delegated"
    :class="cn('cn-font-heading text-base font-medium text-foreground', props.class)"
  >
    <slot />
  </DialogTitle>
</template>

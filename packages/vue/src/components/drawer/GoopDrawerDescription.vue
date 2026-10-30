<script setup lang="ts">
// GoopDrawerDescription: shadcn-vue's DrawerDescription (reka-ui's DialogDescription).
import type { DialogDescriptionProps } from 'reka-ui'
import { cn } from 'cn'
import { DialogDescription } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DialogDescription
    data-slot="drawer-description"
    v-bind="delegated"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <slot />
  </DialogDescription>
</template>

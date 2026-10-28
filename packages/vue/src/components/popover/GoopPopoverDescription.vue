<script setup lang="ts">
// GoopPopoverDescription: shadcn-vue's PopoverDescription.
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <p
    data-slot="popover-description"
    :class="cn('text-muted-foreground', props.class)"
  >
    <slot />
  </p>
</template>

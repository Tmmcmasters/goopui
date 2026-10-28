<script setup lang="ts">
// GoopPopoverTrigger: shadcn-vue's PopoverTrigger. The goo emerges from this element unless
// a GoopPopoverAnchor is present.
import type { PopoverTriggerProps } from 'reka-ui'
import { PopoverTrigger } from 'reka-ui'

const props = defineProps<PopoverTriggerProps>()
</script>

<template>
  <PopoverTrigger
    data-slot="popover-trigger"
    v-bind="props"
  >
    <slot />
  </PopoverTrigger>
</template>

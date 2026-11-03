<script setup lang="ts">
// GoopPopoverTrigger: shadcn-vue's PopoverTrigger. The goo emerges from this element unless
// a GoopPopoverAnchor is present.
import type { PopoverTriggerProps } from 'reka-ui'
import { PopoverTrigger, injectPopoverRootContext } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<PopoverTriggerProps>()
const root = injectPopoverRootContext(null)
const cue = useGoopCue('popoverTrigger', { claim: true, open: () => root?.open.value })
</script>

<template>
  <PopoverTrigger
    data-slot="popover-trigger"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </PopoverTrigger>
</template>

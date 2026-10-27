<script setup lang="ts">
// GoopPopoverAnchor: shadcn-vue's PopoverAnchor. Positions the content, and the goo emerges
// from it instead of the trigger.
import type { PopoverAnchorProps } from 'reka-ui'
import { PopoverAnchor } from 'reka-ui'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { injectGoopPopover } from './context'

const props = defineProps<PopoverAnchorProps>()
const anchor = useTemplateRef<{ $el: unknown }>('anchor')
const ctx = injectGoopPopover()

onMounted(() => {
  const el = anchor.value?.$el
  if (ctx && el instanceof HTMLElement) ctx.anchor.value = el
})
onBeforeUnmount(() => {
  if (ctx) ctx.anchor.value = null
})
</script>

<template>
  <PopoverAnchor
    ref="anchor"
    data-slot="popover-anchor"
    v-bind="props"
  >
    <slot />
  </PopoverAnchor>
</template>

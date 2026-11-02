<script setup lang="ts">
// GoopHoverCardTrigger: shadcn-vue's HoverCardTrigger (`asChild`, renders an `<a>` by
// default). The card's goo blooms from the side facing it.
import type { HoverCardTriggerProps } from 'reka-ui'
import { HoverCardTrigger } from 'reka-ui'

const props = defineProps<HoverCardTriggerProps>()
</script>

<template>
  <HoverCardTrigger
    data-slot="hover-card-trigger"
    v-bind="props"
  >
    <slot />
  </HoverCardTrigger>
</template>

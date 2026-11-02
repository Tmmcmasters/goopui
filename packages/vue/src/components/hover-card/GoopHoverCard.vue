<script setup lang="ts">
// GoopHoverCard: shadcn-vue's HoverCard root (reka-ui HoverCardRoot, same props/emits/slot).
import type { HoverCardRootEmits, HoverCardRootProps } from 'reka-ui'
import { HoverCardRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<HoverCardRootProps>()
const emits = defineEmits<HoverCardRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <HoverCardRoot
    v-slot="slotProps"
    data-slot="hover-card"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </HoverCardRoot>
</template>

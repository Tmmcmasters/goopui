<script setup lang="ts">
// GoopContextMenuPortal: shadcn-vue's ContextMenuPortal (reka-ui's).
import type { ContextMenuPortalProps } from 'reka-ui'
import { ContextMenuPortal } from 'reka-ui'

const props = defineProps<ContextMenuPortalProps>()
</script>

<template>
  <ContextMenuPortal v-bind="props">
    <slot />
  </ContextMenuPortal>
</template>

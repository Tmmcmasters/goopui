<script setup lang="ts">
// GoopContextMenuGroup: shadcn-vue's ContextMenuGroup.
import type { ContextMenuGroupProps } from 'reka-ui'
import { ContextMenuGroup } from 'reka-ui'

const props = defineProps<ContextMenuGroupProps>()
</script>

<template>
  <ContextMenuGroup
    data-slot="context-menu-group"
    v-bind="props"
  >
    <slot />
  </ContextMenuGroup>
</template>

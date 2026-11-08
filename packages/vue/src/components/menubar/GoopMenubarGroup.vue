<script setup lang="ts">
// GoopMenubarGroup: shadcn-vue's MenubarGroup.
import type { MenubarGroupProps } from 'reka-ui'
import { MenubarGroup } from 'reka-ui'

const props = defineProps<MenubarGroupProps>()
</script>

<template>
  <MenubarGroup
    data-slot="menubar-group"
    v-bind="props"
  >
    <slot />
  </MenubarGroup>
</template>

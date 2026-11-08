<script setup lang="ts">
// GoopMenubarPortal: shadcn-vue's MenubarPortal (reka-ui's).
import type { MenubarPortalProps } from 'reka-ui'
import { MenubarPortal } from 'reka-ui'

const props = defineProps<MenubarPortalProps>()
</script>

<template>
  <MenubarPortal v-bind="props">
    <slot />
  </MenubarPortal>
</template>

<script setup lang="ts">
// GoopDrawerClose: shadcn-vue's DrawerClose (reka-ui's DialogClose).
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose } from 'reka-ui'

const props = defineProps<DialogCloseProps>()
</script>

<template>
  <DialogClose
    data-slot="drawer-close"
    v-bind="props"
  >
    <slot />
  </DialogClose>
</template>

<script setup lang="ts">
// GoopDrawerClose: shadcn-vue's DrawerClose (reka-ui's DialogClose).
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<DialogCloseProps>()
const cue = useGoopCue('drawerClose', { claim: true })
</script>

<template>
  <DialogClose
    data-slot="drawer-close"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </DialogClose>
</template>

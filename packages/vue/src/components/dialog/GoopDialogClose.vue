<script setup lang="ts">
// GoopDialogClose: shadcn-vue's DialogClose.
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<DialogCloseProps>()
const cue = useGoopCue('dialogClose', { claim: true })
</script>

<template>
  <DialogClose
    data-slot="dialog-close"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </DialogClose>
</template>

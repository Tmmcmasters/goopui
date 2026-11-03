<script setup lang="ts">
// GoopSheetClose: shadcn-vue's SheetClose.
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<DialogCloseProps>()
const cue = useGoopCue('sheetClose', { claim: true })
</script>

<template>
  <DialogClose
    data-slot="sheet-close"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </DialogClose>
</template>

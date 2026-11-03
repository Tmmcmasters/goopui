<script setup lang="ts">
// GoopSheetTrigger: shadcn-vue's SheetTrigger.
import type { DialogTriggerProps } from 'reka-ui'
import { DialogTrigger } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<DialogTriggerProps>()
const cue = useGoopCue('sheetTrigger', { claim: true })
</script>

<template>
  <DialogTrigger
    data-slot="sheet-trigger"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </DialogTrigger>
</template>

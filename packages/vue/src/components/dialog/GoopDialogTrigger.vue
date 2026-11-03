<script setup lang="ts">
// GoopDialogTrigger: shadcn-vue's DialogTrigger.
import type { DialogTriggerProps } from 'reka-ui'
import { DialogTrigger } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<DialogTriggerProps>()
const cue = useGoopCue('dialogTrigger', { claim: true })
</script>

<template>
  <DialogTrigger
    data-slot="dialog-trigger"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </DialogTrigger>
</template>

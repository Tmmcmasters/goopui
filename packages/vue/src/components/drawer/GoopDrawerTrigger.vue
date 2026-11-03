<script setup lang="ts">
// GoopDrawerTrigger: shadcn-vue's DrawerTrigger (reka-ui's DialogTrigger).
import type { DialogTriggerProps } from 'reka-ui'
import { DialogTrigger } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<DialogTriggerProps>()
const cue = useGoopCue('drawerTrigger', { claim: true })
</script>

<template>
  <DialogTrigger
    data-slot="drawer-trigger"
    v-bind="{ ...props, ...cue }"
  >
    <slot />
  </DialogTrigger>
</template>

<script setup lang="ts">
// GoopDropdownMenuTrigger: shadcn-vue's DropdownMenuTrigger. The menu's goo emerges from it.
import type { DropdownMenuTriggerProps } from 'reka-ui'
import { DropdownMenuTrigger, useForwardProps } from 'reka-ui'
import { useGoopCue } from '../../sound'

const props = defineProps<DropdownMenuTriggerProps>()

const forwardedProps = useForwardProps(props)
const cue = useGoopCue('menuTrigger', { claim: true })
</script>

<template>
  <DropdownMenuTrigger
    data-slot="dropdown-menu-trigger"
    v-bind="{ ...forwardedProps, ...cue }"
  >
    <slot />
  </DropdownMenuTrigger>
</template>

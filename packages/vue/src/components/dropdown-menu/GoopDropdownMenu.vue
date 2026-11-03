<script setup lang="ts">
// GoopDropdownMenu: shadcn-vue's DropdownMenu root (reka-ui DropdownMenuRoot, same
// props/emits/slot).
import type { DropdownMenuRootEmits, DropdownMenuRootProps } from 'reka-ui'
import { DropdownMenuRoot, useForwardPropsEmits } from 'reka-ui'
import type { GoopSoundProps } from '../../goop-props'
import { omitSound, useGoopSound } from '../../sound'

const props = withDefaults(defineProps<DropdownMenuRootProps & GoopSoundProps>(), { sound: undefined })
const emits = defineEmits<DropdownMenuRootEmits>()

const forwarded = useForwardPropsEmits(omitSound(props), emits)
useGoopSound(() => props.sound)
</script>

<template>
  <DropdownMenuRoot
    v-slot="slotProps"
    data-slot="dropdown-menu"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </DropdownMenuRoot>
</template>

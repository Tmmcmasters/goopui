<script setup lang="ts">
// GoopPopover: shadcn-vue's Popover root (reka-ui PopoverRoot, same props/emits/slot).
import type { PopoverRootEmits, PopoverRootProps } from 'reka-ui'
import { PopoverRoot, useForwardPropsEmits } from 'reka-ui'
import { provideGoopPopover } from './context'
import type { GoopSoundProps } from '../../goop-props'
import { omitSound, useGoopSound } from '../../sound'

const props = withDefaults(defineProps<PopoverRootProps & GoopSoundProps>(), { sound: undefined })
const emits = defineEmits<PopoverRootEmits>()

const forwarded = useForwardPropsEmits(omitSound(props), emits)
useGoopSound(() => props.sound)
provideGoopPopover()
</script>

<template>
  <PopoverRoot
    v-slot="slotProps"
    data-slot="popover"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </PopoverRoot>
</template>

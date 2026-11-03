<script setup lang="ts">
// GoopDialog: shadcn-vue's Dialog root (reka-ui DialogRoot, same props/emits/slot).
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import { DialogRoot, useForwardPropsEmits } from 'reka-ui'
import type { GoopSoundProps } from '../../goop-props'
import { omitSound, useGoopSound } from '../../sound'

const props = withDefaults(defineProps<DialogRootProps & GoopSoundProps>(), { sound: undefined })
const emits = defineEmits<DialogRootEmits>()

const forwarded = useForwardPropsEmits(omitSound(props), emits)
useGoopSound(() => props.sound)
</script>

<template>
  <DialogRoot
    v-slot="slotProps"
    data-slot="dialog"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </DialogRoot>
</template>

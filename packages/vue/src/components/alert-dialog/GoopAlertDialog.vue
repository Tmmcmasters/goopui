<script setup lang="ts">
// GoopAlertDialog: shadcn-vue's AlertDialog root (reka-ui AlertDialogRoot, same props/emits/slot).
import type { AlertDialogEmits, AlertDialogProps } from 'reka-ui'
import { AlertDialogRoot, useForwardPropsEmits } from 'reka-ui'
import type { GoopSoundProps } from '../../goop-props'
import { omitSound, useGoopSound } from '../../sound'

const props = withDefaults(defineProps<AlertDialogProps & GoopSoundProps>(), { sound: undefined })
const emits = defineEmits<AlertDialogEmits>()

const forwarded = useForwardPropsEmits(omitSound(props), emits)
useGoopSound(() => props.sound)
</script>

<template>
  <AlertDialogRoot
    v-slot="slotProps"
    data-slot="alert-dialog"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </AlertDialogRoot>
</template>

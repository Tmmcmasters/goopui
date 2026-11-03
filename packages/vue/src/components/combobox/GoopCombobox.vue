<script setup lang="ts">
// GoopCombobox: shadcn-vue's Combobox root (reka-ui ComboboxRoot, same props/emits/slot).
import type { ComboboxRootEmits, ComboboxRootProps } from 'reka-ui'
import { ComboboxRoot, useForwardPropsEmits } from 'reka-ui'
import { shallowRef } from 'vue'
import { provideGoopComboboxRoot } from './context'
import type { GoopSoundProps } from '../../goop-props'
import { omitSound, useGoopSound } from '../../sound'

const props = withDefaults(defineProps<ComboboxRootProps & GoopSoundProps>(), { sound: undefined })
const emits = defineEmits<ComboboxRootEmits>()

const forwarded = useForwardPropsEmits(omitSound(props), emits)
useGoopSound(() => props.sound)
provideGoopComboboxRoot({ anchor: shallowRef(null) })
</script>

<template>
  <ComboboxRoot
    v-slot="slotProps"
    data-slot="combobox"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </ComboboxRoot>
</template>

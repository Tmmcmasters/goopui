<script setup lang="ts">
// GoopCombobox: shadcn-vue's Combobox root (reka-ui ComboboxRoot, same props/emits/slot).
import type { ComboboxRootEmits, ComboboxRootProps } from 'reka-ui'
import { ComboboxRoot, useForwardPropsEmits } from 'reka-ui'
import { shallowRef } from 'vue'
import { provideGoopComboboxRoot } from './context'

const props = defineProps<ComboboxRootProps>()
const emits = defineEmits<ComboboxRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
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

<script setup lang="ts">
// GoopSelectValue: shadcn-vue's SelectValue (`placeholder`, default slot).
import type { SelectValueProps } from 'reka-ui'
import { SelectValue } from 'reka-ui'

const props = defineProps<SelectValueProps>()
</script>

<template>
  <SelectValue
    v-slot="slotProps"
    data-slot="select-value"
    v-bind="props"
  >
    <slot v-bind="slotProps" />
  </SelectValue>
</template>

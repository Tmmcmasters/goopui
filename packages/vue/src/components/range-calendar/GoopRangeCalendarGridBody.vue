<script setup lang="ts">
// GoopRangeCalendarGridBody: shadcn-vue's RangeCalendarGridBody (reka RangeCalendarGridBody, the weeks' tbody).
import type { RangeCalendarGridBodyProps } from 'reka-ui'
import { RangeCalendarGridBody } from 'reka-ui'

const props = defineProps<RangeCalendarGridBodyProps>()
</script>

<template>
  <RangeCalendarGridBody data-slot="range-calendar-grid-body" v-bind="props">
    <slot />
  </RangeCalendarGridBody>
</template>

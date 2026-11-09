<script setup lang="ts">
// GoopRangeCalendarGridHead: shadcn-vue's RangeCalendarGridHead (reka RangeCalendarGridHead, the weekdays' thead).
import type { RangeCalendarGridHeadProps } from 'reka-ui'
import { RangeCalendarGridHead } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

const props = defineProps<RangeCalendarGridHeadProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <RangeCalendarGridHead data-slot="range-calendar-grid-head" v-bind="props">
    <slot />
  </RangeCalendarGridHead>
</template>

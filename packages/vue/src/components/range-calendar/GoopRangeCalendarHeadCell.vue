<script setup lang="ts">
// GoopRangeCalendarHeadCell: shadcn-vue's RangeCalendarHeadCell (reka RangeCalendarHeadCell, a weekday `th`).
import { cn } from 'cn'
import type { RangeCalendarHeadCellProps } from 'reka-ui'
import { RangeCalendarHeadCell, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { RANGE_CALENDAR_HEAD_CELL } from './variants'

const props = defineProps<RangeCalendarHeadCellProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarHeadCell data-slot="range-calendar-head-cell" :class="cn(RANGE_CALENDAR_HEAD_CELL, props.class)" v-bind="forwarded">
    <slot />
  </RangeCalendarHeadCell>
</template>

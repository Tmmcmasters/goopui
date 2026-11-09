<script setup lang="ts">
// GoopRangeCalendarGridRow: shadcn-vue's RangeCalendarGridRow (reka RangeCalendarGridRow, a `tr`, `class` merge).
import { cn } from 'cn'
import type { RangeCalendarGridRowProps } from 'reka-ui'
import { RangeCalendarGridRow, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { RANGE_CALENDAR_GRID_ROW } from './variants'

const props = defineProps<RangeCalendarGridRowProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarGridRow data-slot="range-calendar-grid-row" :class="cn(RANGE_CALENDAR_GRID_ROW, props.class)" v-bind="forwarded">
    <slot />
  </RangeCalendarGridRow>
</template>

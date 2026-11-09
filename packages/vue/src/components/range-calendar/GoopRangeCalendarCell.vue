<script setup lang="ts">
// GoopRangeCalendarCell: shadcn-vue's RangeCalendarCell (reka RangeCalendarCell, `date`, `class` merge, same
// classes). Once the parent GoopRangeCalendar's goo is attached its flat selected background steps
// aside for the goo (goop.css).
import { cn } from 'cn'
import type { RangeCalendarCellProps } from 'reka-ui'
import { RangeCalendarCell, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { RANGE_CALENDAR_CELL } from './variants'

const props = defineProps<RangeCalendarCellProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarCell data-slot="range-calendar-cell" :class="cn(RANGE_CALENDAR_CELL, props.class)" v-bind="forwarded">
    <slot />
  </RangeCalendarCell>
</template>

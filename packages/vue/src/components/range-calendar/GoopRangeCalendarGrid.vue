<script setup lang="ts">
// GoopRangeCalendarGrid: shadcn-vue's RangeCalendarGrid (reka RangeCalendarGrid, a month's table, `class` merge).
import { cn } from 'cn'
import type { RangeCalendarGridProps } from 'reka-ui'
import { RangeCalendarGrid, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { RANGE_CALENDAR_GRID } from './variants'

const props = defineProps<RangeCalendarGridProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarGrid data-slot="range-calendar-grid" :class="cn(RANGE_CALENDAR_GRID, props.class)" v-bind="forwarded">
    <slot />
  </RangeCalendarGrid>
</template>

<script setup lang="ts">
// GoopCalendarGridRow: shadcn-vue's CalendarGridRow (reka CalendarGridRow, a `tr`, `class` merge).
import { cn } from 'cn'
import type { CalendarGridRowProps } from 'reka-ui'
import { CalendarGridRow, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { CALENDAR_GRID_ROW } from './variants'

const props = defineProps<CalendarGridRowProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarGridRow data-slot="calendar-grid-row" :class="cn(CALENDAR_GRID_ROW, props.class)" v-bind="forwarded">
    <slot />
  </CalendarGridRow>
</template>

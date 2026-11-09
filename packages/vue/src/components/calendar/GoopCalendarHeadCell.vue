<script setup lang="ts">
// GoopCalendarHeadCell: shadcn-vue's CalendarHeadCell (reka CalendarHeadCell, a weekday `th`).
import { cn } from 'cn'
import type { CalendarHeadCellProps } from 'reka-ui'
import { CalendarHeadCell, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { CALENDAR_HEAD_CELL } from './variants'

const props = defineProps<CalendarHeadCellProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarHeadCell data-slot="calendar-head-cell" :class="cn(CALENDAR_HEAD_CELL, props.class)" v-bind="forwarded">
    <slot />
  </CalendarHeadCell>
</template>

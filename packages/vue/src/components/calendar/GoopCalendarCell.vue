<script setup lang="ts">
// GoopCalendarCell: shadcn-vue's CalendarCell (reka CalendarCell, `date`, `class` merge, same
// classes). Once the parent GoopCalendar's goo is attached its flat selected background steps
// aside for the goo (goop.css).
import { cn } from 'cn'
import type { CalendarCellProps } from 'reka-ui'
import { CalendarCell, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { CALENDAR_CELL } from './variants'

const props = defineProps<CalendarCellProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarCell data-slot="calendar-cell" :class="cn(CALENDAR_CELL, props.class)" v-bind="forwarded">
    <slot />
  </CalendarCell>
</template>

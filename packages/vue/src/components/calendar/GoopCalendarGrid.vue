<script setup lang="ts">
// GoopCalendarGrid: shadcn-vue's CalendarGrid (reka CalendarGrid, a month's table, `class` merge).
import { cn } from 'cn'
import type { CalendarGridProps } from 'reka-ui'
import { CalendarGrid, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { CALENDAR_GRID } from './variants'

const props = defineProps<CalendarGridProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarGrid data-slot="calendar-grid" :class="cn(CALENDAR_GRID, props.class)" v-bind="forwarded">
    <slot />
  </CalendarGrid>
</template>

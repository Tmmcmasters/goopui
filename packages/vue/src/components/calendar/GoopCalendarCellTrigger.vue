<script setup lang="ts">
// GoopCalendarCellTrigger: shadcn-vue's CalendarCellTrigger (reka CalendarCellTrigger, `day`,
// `month`, `class` merge, same classes: a ghost button). Its goo (selection fill, focus wash)
// comes from the parent GoopCalendar.
import { cn } from 'cn'
import type { CalendarCellTriggerProps } from 'reka-ui'
import { CalendarCellTrigger, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { buttonVariants } from '../button/variants'
import { CALENDAR_CELL_TRIGGER } from './variants'

const props = withDefaults(defineProps<CalendarCellTriggerProps & { class?: HTMLAttributes['class'] }>(), { as: 'button' })
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarCellTrigger
    data-slot="calendar-cell-trigger"
    :class="cn(buttonVariants({ variant: 'ghost' }), CALENDAR_CELL_TRIGGER, props.class)"
    v-bind="forwarded"
  >
    <slot />
  </CalendarCellTrigger>
</template>

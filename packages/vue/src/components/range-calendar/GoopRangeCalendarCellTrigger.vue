<script setup lang="ts">
// GoopRangeCalendarCellTrigger: shadcn-vue's RangeCalendarCellTrigger (reka RangeCalendarCellTrigger, `day`,
// `month`, `class` merge, same classes: a ghost button). Its goo (selection fill, focus wash)
// comes from the parent GoopRangeCalendar.
import { cn } from 'cn'
import type { RangeCalendarCellTriggerProps } from 'reka-ui'
import { RangeCalendarCellTrigger, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { buttonVariants } from '../button/variants'
import { RANGE_CALENDAR_CELL_TRIGGER } from './variants'

const props = withDefaults(defineProps<RangeCalendarCellTriggerProps & { class?: HTMLAttributes['class'] }>(), { as: 'button' })
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarCellTrigger
    data-slot="range-calendar-trigger"
    :class="cn(buttonVariants({ variant: 'ghost' }), RANGE_CALENDAR_CELL_TRIGGER, props.class)"
    v-bind="forwarded"
  >
    <slot />
  </RangeCalendarCellTrigger>
</template>

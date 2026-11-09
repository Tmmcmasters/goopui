<script setup lang="ts">
// GoopRangeCalendarHeading: shadcn-vue's RangeCalendarHeading (reka RangeCalendarHeading: the month / year
// heading, default slot gets `headingValue`).
import { cn } from 'cn'
import type { RangeCalendarHeadingProps } from 'reka-ui'
import { RangeCalendarHeading, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { RANGE_CALENDAR_HEADING } from './variants'

const props = defineProps<RangeCalendarHeadingProps & { class?: HTMLAttributes['class'] }>()
defineSlots<{ default?: (props: { headingValue: string }) => unknown }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarHeading v-slot="{ headingValue }" data-slot="range-calendar-heading" :class="cn(RANGE_CALENDAR_HEADING, props.class)" v-bind="forwarded">
    <slot :heading-value="headingValue">
      {{ headingValue }}
    </slot>
  </RangeCalendarHeading>
</template>

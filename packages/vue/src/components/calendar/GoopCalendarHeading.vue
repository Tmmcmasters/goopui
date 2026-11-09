<script setup lang="ts">
// GoopCalendarHeading: shadcn-vue's CalendarHeading (reka CalendarHeading: the month / year
// heading, default slot gets `headingValue`).
import { cn } from 'cn'
import type { CalendarHeadingProps } from 'reka-ui'
import { CalendarHeading, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { CALENDAR_HEADING } from './variants'

const props = defineProps<CalendarHeadingProps & { class?: HTMLAttributes['class'] }>()
defineSlots<{ default?: (props: { headingValue: string }) => unknown }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarHeading v-slot="{ headingValue }" data-slot="calendar-heading" :class="cn(CALENDAR_HEADING, props.class)" v-bind="forwarded">
    <slot :heading-value="headingValue">
      {{ headingValue }}
    </slot>
  </CalendarHeading>
</template>

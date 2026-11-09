<script setup lang="ts">
// GoopRangeCalendarHeader: shadcn-vue's RangeCalendarHeader (reka RangeCalendarHeader, the heading + nav row).
import { cn } from 'cn'
import type { RangeCalendarHeaderProps } from 'reka-ui'
import { RangeCalendarHeader, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { RANGE_CALENDAR_HEADER } from './variants'

const props = defineProps<RangeCalendarHeaderProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarHeader data-slot="range-calendar-header" :class="cn(RANGE_CALENDAR_HEADER, props.class)" v-bind="forwarded">
    <slot />
  </RangeCalendarHeader>
</template>

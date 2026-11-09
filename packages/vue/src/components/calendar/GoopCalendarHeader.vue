<script setup lang="ts">
// GoopCalendarHeader: shadcn-vue's CalendarHeader (reka CalendarHeader, the heading + nav row).
import { cn } from 'cn'
import type { CalendarHeaderProps } from 'reka-ui'
import { CalendarHeader, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { CALENDAR_HEADER } from './variants'

const props = defineProps<CalendarHeaderProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarHeader data-slot="calendar-header" :class="cn(CALENDAR_HEADER, props.class)" v-bind="forwarded">
    <slot />
  </CalendarHeader>
</template>

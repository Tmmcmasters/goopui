<script setup lang="ts">
// GoopRangeCalendarNextButton: shadcn-vue's RangeCalendarNextButton (reka RangeCalendarNext, an outline
// button with lucide's chevron-right; default slot replaces the icon). Paging forward sloshes
// the parent GoopRangeCalendar's days.
import { cn } from 'cn'
import type { RangeCalendarNextProps } from 'reka-ui'
import { RangeCalendarNext, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { buttonVariants } from '../button/variants'
import { RANGE_CALENDAR_NEXT_BUTTON } from './variants'

const props = defineProps<RangeCalendarNextProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <RangeCalendarNext
    data-slot="range-calendar-next-button"
    :class="cn(buttonVariants({ variant: 'outline' }), RANGE_CALENDAR_NEXT_BUTTON, props.class)"
    v-bind="forwarded"
  >
    <slot>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="cn-rtl-flip size-4"><path d="m9 18 6-6-6-6" /></svg>
    </slot>
  </RangeCalendarNext>
</template>

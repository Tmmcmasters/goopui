<script setup lang="ts">
// GoopRangeCalendar: shadcn-vue's RangeCalendar (reka-ui RangeCalendarRoot: v-model
// `{ start, end }`, v-model:placeholder, locale, numberOfMonths, minValue / maxValue,
// isDateDisabled, ... forwarded; same parts and classes). On mount core's `attachCalendar`
// adds the goo, on aria-hidden layers under the real day buttons:
//   - the days of the range (and reka's hover preview while you pick the end) fill as one
//     gooey `band`: neighbouring days in a week merge, a week ends in a soft round end and the
//     band carries on in the next row; it grows out day by day as the range extends and drains
//     from the far end as it shrinks;
//   - the start and end days are primary goo caps that land with a small `pulse`;
//   - paging the month gives the days a gentle `slosh` the way the month moved;
//   - the hover / keyboard-focus highlight is a goo `focus` wash gliding between days.
// Every effect is a prop; `:goo="false"` (and SSR, until mount) is a plain shadcn
// RangeCalendar. Reduced motion: static fills, the wash snaps, no slosh.
import { attachCalendar, type CalendarHandle } from '@goopui/core'
import { cn } from 'cn'
import type { RangeCalendarRootEmits, RangeCalendarRootProps } from 'reka-ui'
import { RangeCalendarRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { CALENDAR_PROP_KEYS, toCalendarOptions, type GoopCalendarProps, type GoopSoundProps } from '../../goop-props'
import { useGoopSound } from '../../sound'
import GoopRangeCalendarCell from './GoopRangeCalendarCell.vue'
import GoopRangeCalendarCellTrigger from './GoopRangeCalendarCellTrigger.vue'
import GoopRangeCalendarGrid from './GoopRangeCalendarGrid.vue'
import GoopRangeCalendarGridBody from './GoopRangeCalendarGridBody.vue'
import GoopRangeCalendarGridHead from './GoopRangeCalendarGridHead.vue'
import GoopRangeCalendarGridRow from './GoopRangeCalendarGridRow.vue'
import GoopRangeCalendarHeadCell from './GoopRangeCalendarHeadCell.vue'
import GoopRangeCalendarHeader from './GoopRangeCalendarHeader.vue'
import GoopRangeCalendarHeading from './GoopRangeCalendarHeading.vue'
import GoopRangeCalendarNextButton from './GoopRangeCalendarNextButton.vue'
import GoopRangeCalendarPrevButton from './GoopRangeCalendarPrevButton.vue'
import { RANGE_CALENDAR, RANGE_CALENDAR_MONTHS, RANGE_CALENDAR_NAV, RANGE_CALENDAR_WEEK } from './variants'

const props = withDefaults(
  defineProps<RangeCalendarRootProps & GoopCalendarProps & GoopSoundProps & { class?: HTMLAttributes['class'] }>(),
  {
    modelValue: undefined,
    sound: undefined,
    goo: true,
    flow: undefined,
    pulse: undefined,
    band: undefined,
    slosh: undefined,
    focus: undefined,
    textFollow: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
  },
)
const emits = defineEmits<RangeCalendarRootEmits>()

const OWN = new Set<string>([...CALENDAR_PROP_KEYS, 'sound', 'class'])
const delegated = computed(
  () => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as RangeCalendarRootProps,
)
const forwarded = useForwardPropsEmits(delegated, emits)
useGoopSound(() => props.sound)

const config = useGoopConfig()
const options = computed(() => {
  const o = toCalendarOptions(props, config)
  const v = props.modelValue
  return o && { ...o, range: true, value: v ? [v.start?.toString() ?? null, v.end?.toString() ?? null] : v }
})

const root = useTemplateRef<{ $el: unknown }>('root')
const handle = shallowRef<CalendarHandle | null>(null)
let mounted = false

const attach = (): void => {
  const el = root.value?.$el as Element | null | undefined
  if (handle.value || !mounted || !options.value || !el || el.nodeType !== 1) return
  handle.value = attachCalendar(el as HTMLElement, options.value)
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
onMounted(() => {
  mounted = true
  attach()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
// flush: 'post' so reka's data-selected / data-selection-* are patched before core reads them.
watch(
  options,
  (next) => {
    if (!next) detach()
    else if (handle.value) handle.value.update(next)
    else attach()
  },
  { flush: 'post' },
)

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The range calendar root element. */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <RangeCalendarRoot
    ref="root"
    v-slot="{ grid, weekDays }"
    data-slot="range-calendar"
    :data-goop-host="goo ? 'range-calendar' : undefined"
    :class="cn(RANGE_CALENDAR, props.class)"
    v-bind="forwarded"
  >
    <GoopRangeCalendarHeader>
      <GoopRangeCalendarHeading />
      <div :class="RANGE_CALENDAR_NAV">
        <GoopRangeCalendarPrevButton />
        <GoopRangeCalendarNextButton />
      </div>
    </GoopRangeCalendarHeader>

    <div :class="RANGE_CALENDAR_MONTHS">
      <GoopRangeCalendarGrid v-for="month in grid" :key="month.value.toString()">
        <GoopRangeCalendarGridHead>
          <GoopRangeCalendarGridRow>
            <GoopRangeCalendarHeadCell v-for="day in weekDays" :key="day">
              {{ day }}
            </GoopRangeCalendarHeadCell>
          </GoopRangeCalendarGridRow>
        </GoopRangeCalendarGridHead>
        <GoopRangeCalendarGridBody>
          <GoopRangeCalendarGridRow v-for="(weekDates, index) in month.rows" :key="`weekDate-${index}`" :class="RANGE_CALENDAR_WEEK">
            <GoopRangeCalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
              <GoopRangeCalendarCellTrigger :day="weekDate" :month="month.value" />
            </GoopRangeCalendarCell>
          </GoopRangeCalendarGridRow>
        </GoopRangeCalendarGridBody>
      </GoopRangeCalendarGrid>
    </div>
  </RangeCalendarRoot>
</template>

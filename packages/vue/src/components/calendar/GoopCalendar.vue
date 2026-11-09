<script setup lang="ts">
// GoopCalendar: shadcn-vue's Calendar (reka-ui CalendarRoot: v-model, v-model:placeholder,
// locale, weekStartsOn, numberOfMonths, minValue / maxValue, isDateDisabled, ... forwarded;
// same parts, classes and slots: calendar-heading, calendar-prev-icon, calendar-next-icon). On
// mount core's `attachCalendar` adds the goo, on aria-hidden layers under the real day buttons:
//   - the selected day is a goo fill; picking another day makes it `flow` there (gather, neck,
//     pinch off, travel, flood in from the side it arrives on) and land with a small `pulse`;
//   - paging the month gives the days a gentle `slosh` the way the month moved;
//   - the hover / keyboard-focus highlight is a goo `focus` wash gliding between days.
// The selected day's label colour follows the goo (`textFollow`). Every effect is a prop;
// `:goo="false"` (and SSR, until mount) is a plain shadcn Calendar. Reduced motion: static
// fills, the wash snaps, no slosh.
import { attachCalendar, type CalendarHandle } from '@goopui/core'
import { cn } from 'cn'
import type { CalendarRootEmits, CalendarRootProps } from 'reka-ui'
import { CalendarRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { CALENDAR_PROP_KEYS, toCalendarOptions, type GoopCalendarProps, type GoopSoundProps } from '../../goop-props'
import { useGoopSound } from '../../sound'
import GoopCalendarCell from './GoopCalendarCell.vue'
import GoopCalendarCellTrigger from './GoopCalendarCellTrigger.vue'
import GoopCalendarGrid from './GoopCalendarGrid.vue'
import GoopCalendarGridBody from './GoopCalendarGridBody.vue'
import GoopCalendarGridHead from './GoopCalendarGridHead.vue'
import GoopCalendarGridRow from './GoopCalendarGridRow.vue'
import GoopCalendarHeadCell from './GoopCalendarHeadCell.vue'
import GoopCalendarHeader from './GoopCalendarHeader.vue'
import GoopCalendarHeading from './GoopCalendarHeading.vue'
import GoopCalendarNextButton from './GoopCalendarNextButton.vue'
import GoopCalendarPrevButton from './GoopCalendarPrevButton.vue'
import { CALENDAR, CALENDAR_MONTHS, CALENDAR_NAV, CALENDAR_WEEK } from './variants'

const props = withDefaults(defineProps<CalendarRootProps & GoopCalendarProps & GoopSoundProps & { class?: HTMLAttributes['class'] }>(), {
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
})
const emits = defineEmits<CalendarRootEmits>()

const OWN = new Set<string>([...CALENDAR_PROP_KEYS, 'sound', 'class'])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as CalendarRootProps)
const forwarded = useForwardPropsEmits(delegated, emits)
useGoopSound(() => props.sound)

const config = useGoopConfig()
const options = computed(() => {
  const o = toCalendarOptions(props, config)
  const v = props.modelValue
  return o && { ...o, value: Array.isArray(v) ? v.map(String) : (v?.toString() ?? v) }
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
// flush: 'post' so reka's data-selected is patched before core reads it.
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
  /** The calendar root element. */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <CalendarRoot
    ref="root"
    v-slot="{ grid, weekDays, date }"
    v-bind="forwarded"
    data-slot="calendar"
    :data-goop-host="goo ? 'calendar' : undefined"
    :class="cn(CALENDAR, props.class)"
  >
    <GoopCalendarHeader class="pt-0">
      <slot name="calendar-heading" :date="date">
        <GoopCalendarHeading />
      </slot>

      <nav :class="CALENDAR_NAV">
        <GoopCalendarPrevButton>
          <slot name="calendar-prev-icon" />
        </GoopCalendarPrevButton>
        <GoopCalendarNextButton>
          <slot name="calendar-next-icon" />
        </GoopCalendarNextButton>
      </nav>
    </GoopCalendarHeader>

    <div :class="CALENDAR_MONTHS">
      <GoopCalendarGrid v-for="month in grid" :key="month.value.toString()">
        <GoopCalendarGridHead>
          <GoopCalendarGridRow>
            <GoopCalendarHeadCell v-for="day in weekDays" :key="day">
              {{ day }}
            </GoopCalendarHeadCell>
          </GoopCalendarGridRow>
        </GoopCalendarGridHead>
        <GoopCalendarGridBody>
          <GoopCalendarGridRow v-for="(weekDates, index) in month.rows" :key="`weekDate-${index}`" :class="CALENDAR_WEEK">
            <GoopCalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
              <GoopCalendarCellTrigger :day="weekDate" :month="month.value" />
            </GoopCalendarCell>
          </GoopCalendarGridRow>
        </GoopCalendarGridBody>
      </GoopCalendarGrid>
    </div>
  </CalendarRoot>
</template>

<script setup lang="ts">
// Live range calendar demos for the Range Calendar docs page: real <GoopRangeCalendar>s. `set`
// picks the group. Keep each set in sync with the code sample beside it in the docs.
// Client only, like DemoCalendar: the month in view and reka's data-today depend on today's
// date, which differs between the static build and the visit.
import { getLocalTimeZone, today, type DateValue } from '@internationalized/date'

withDefaults(defineProps<{ set?: 'basic' | 'months' | 'states' }>(), { set: 'basic' })
type Range = { start: DateValue | undefined; end: DateValue | undefined }
const start = today(getLocalTimeZone())
// shallowRef: a deep ref's unwrapped type drops the dates' private fields.
const range = shallowRef<Range>({ start, end: start.add({ days: 6 }) })
const trip = shallowRef<Range>({ start: start.add({ days: 3 }), end: start.add({ days: 17 }) })
const plain = shallowRef<Range>({ start, end: start.add({ days: 4 }) })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/calendar.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="range-calendar" :set="set" :pg="{ main: pg.props }" />
  <ClientOnly v-else>
    <GoopRangeCalendar v-if="set === 'basic'" v-model="range" class="rounded-lg border" v-bind="pg.props" />
    <GoopRangeCalendar v-else-if="set === 'months'" v-model="trip" class="rounded-lg border" :number-of-months="2" />
    <GoopRangeCalendar v-else v-model="plain" class="rounded-lg border" :goo="false" />
    <template #fallback>
      <div :class="set === 'months' ? 'h-[18.5rem] w-[31rem] max-w-full' : 'h-[18.5rem] w-[15.5rem]'" class="rounded-lg border" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
// Live calendar demos for the Calendar docs page: real <GoopCalendar>s. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
// The calendars depend on today's date (the month in view, reka's data-today), which differs
// between the static build and the visit, so they render on the client only (a same-size
// placeholder holds the space). The component itself SSRs plain shadcn markup.
import { getLocalTimeZone, today, type DateValue } from '@internationalized/date'

withDefaults(defineProps<{ set?: 'basic' | 'states' }>(), { set: 'basic' })
const now = today(getLocalTimeZone())
// shallowRef: a deep ref's unwrapped type drops the dates' private fields.
const date = shallowRef<DateValue>(now)
const other = shallowRef<DateValue>(now.add({ days: 2 }))
const plain = shallowRef<DateValue>(now)
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/calendar.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="calendar" :set="set" :pg="{ main: pg.props }" />
  <ClientOnly v-else>
    <GoopCalendar v-if="set === 'basic'" v-model="date" class="rounded-lg border" v-bind="pg.props" />
    <div v-else class="flex flex-wrap items-start justify-center gap-4">
      <GoopCalendar v-model="other" class="rounded-lg border" preset="wild" :is-date-disabled="(d) => d.day % 7 === 0" />
      <GoopCalendar v-model="plain" class="rounded-lg border" :goo="false" />
    </div>
    <template #fallback>
      <div v-if="set === 'basic'" class="h-[18.5rem] w-[15.5rem] rounded-lg border" aria-hidden="true" />
      <div v-else class="flex flex-wrap items-start justify-center gap-4" aria-hidden="true">
        <div class="h-[18.5rem] w-[15.5rem] rounded-lg border" />
        <div class="h-[18.5rem] w-[15.5rem] rounded-lg border" />
      </div>
    </template>
  </ClientOnly>
</template>

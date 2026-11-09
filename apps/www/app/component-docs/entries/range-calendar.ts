import { effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'
import { calendarGoo } from './calendar'

export default defineComponentDoc({
  slug: 'range-calendar',
  title: 'Range Calendar',
  category: 'Forms',
  component: 'GoopRangeCalendar',
  code: `<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import type { DateRange } from 'reka-ui'

const start = today(getLocalTimeZone())
const range = shallowRef<DateRange>({ start, end: start.add({ days: 6 }) })
</script>

<template>
  <GoopRangeCalendar v-model="range" class="rounded-lg border"{{main}} />
</template>`,
  controls: [preset(), speed(), strength('band'), strength('pulse'), strength('slosh'), effect('focus'), effect('textFollow', { advanced: true })],
  tables: {
    main: {
      caption: 'GoopRangeCalendar props',
      rows: [
        { prop: 'modelValue', type: '{ start: DateValue, end: DateValue }', def: '', note: 'The range (v-model), @internationalized/date values.' },
        { prop: 'placeholder', type: 'DateValue', def: 'today', note: 'The month in view (v-model:placeholder).' },
        { prop: 'locale, numberOfMonths, minValue, maxValue, isDateDisabled, allowNonContiguousRanges, ...', type: '', def: '', note: "reka-ui's RangeCalendarRoot props, forwarded as they are." },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn.' },
        { prop: 'band', type: 'boolean | number', def: 'true', note: "The days of the range (and the hover preview while you pick the end) fill as one gooey band: neighbouring days merge, each week ends round and the band carries on in the next row. It grows out day by day as the range extends and drains from the far end as it shrinks. false: shadcn's flat cell background." },
        ...calendarGoo,
      ],
    },
  },
})

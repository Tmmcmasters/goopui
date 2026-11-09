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
  reactCode: `import { GoopRangeCalendar, type DateRange } from '@goopui/react'
import { useState } from 'react'

export function TripDates() {
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = new Date()
    return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6) }
  })
  return <GoopRangeCalendar selected={range} onSelect={setRange} className="rounded-lg border"{{main}} />
}`,
  controls: [preset(), speed(), strength('band'), strength('pulse'), strength('slosh'), effect('focus'), effect('textFollow', { advanced: true })],
  reactTables: {
    main: {
      caption: 'GoopRangeCalendar props',
      rows: [
        { prop: 'selected, onSelect', type: 'DateRange', def: '', note: "The range ({ from, to }), controlled with onSelect, as react-day-picker's mode=\"range\". The first click starts a one-day range; the next one sets the end." },
        { prop: 'month, defaultMonth, onMonthChange', type: 'Date', def: 'today', note: 'The month in view.' },
        { prop: 'locale, numberOfMonths, disabled, min, max, excludeDisabled, required, ...', type: '', def: '', note: "GoopCalendar's props (react-day-picker's DayPicker), forwarded as they are." },
        { prop: 'className, classNames, components', type: '', def: '', note: "Merged over shadcn/ui's Calendar, like shadcn/ui." },
        { prop: 'ref', type: 'Ref<HTMLDivElement>', def: '', note: 'The calendar root.' },
        { prop: 'goopRef', type: 'Ref<CalendarHandle>', def: '', note: 'The live engine handle (null before mount or with goo off).' },
        { prop: 'band', type: 'boolean | number', def: 'true', note: "The days of the range (and the hover preview while you pick the end) fill as one gooey band: neighbouring days merge, each week ends round and the band carries on in the next row. It grows out day by day as the range extends and drains from the far end as it shrinks. false: shadcn's flat range background." },
        ...calendarGoo,
      ],
    },
  },
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

import { effect, preset, speed, strength } from '../controls'
import { defineComponentDoc, type PropRow } from '../types'

const fx = 'boolean | number'

/** The goo props GoopCalendar and GoopRangeCalendar share. */
export const calendarGoo: PropRow[] = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn calendar.' },
  { prop: 'slosh', type: fx, def: 'true', note: 'Paging the month gives the days a gentle slosh the way the month moved: each column swings a few px and springs back, in a wave from the leading side. A number scales it.' },
  { prop: 'focus', type: fx, def: 'true', note: "The hover / keyboard-focus highlight is a goo wash that glides from day to day, so arrow-key navigation visibly moves the goo. false: shadcn's flat hover." },
  { prop: 'pulse', type: fx, def: 'true', note: 'A small jelly pulse as the selected goo lands. A number scales it.' },
  { prop: 'textFollow', type: 'boolean', def: 'true', note: "A selected day's label colour follows the goo's edge as it floods in. false flips it all at once." },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: how far the days slosh, how fast the band grows.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

export default defineComponentDoc({
  slug: 'calendar',
  title: 'Calendar',
  category: 'Forms',
  component: 'GoopCalendar',
  code: `<script setup lang="ts">
import { getLocalTimeZone, today, type DateValue } from '@internationalized/date'

const date = shallowRef<DateValue>(today(getLocalTimeZone()))
</script>

<template>
  <GoopCalendar v-model="date" class="rounded-lg border"{{main}} />
</template>`,
  controls: [preset(), speed(), effect('flow'), strength('pulse'), strength('slosh'), effect('focus'), effect('textFollow', { advanced: true })],
  tables: {
    main: {
      caption: 'GoopCalendar props',
      rows: [
        { prop: 'modelValue', type: 'DateValue', def: '', note: 'The selected day (v-model), an @internationalized/date value.' },
        { prop: 'placeholder', type: 'DateValue', def: 'today', note: 'The month in view (v-model:placeholder).' },
        { prop: 'locale, weekStartsOn, numberOfMonths, minValue, maxValue, isDateDisabled, fixedWeeks, ...', type: '', def: '', note: "reka-ui's CalendarRoot props, forwarded as they are." },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn.' },
        { prop: 'flow', type: fx, def: 'true', note: 'Picking a new day makes the goo flow there: it gathers, necks out, pinches off, travels and floods the new day from the side it arrives on. false: the old day drains and the new one floods in place.' },
        ...calendarGoo,
      ],
    },
  },
})

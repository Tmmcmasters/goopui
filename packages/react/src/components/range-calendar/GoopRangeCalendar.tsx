'use client'
// GoopRangeCalendar: shadcn/ui's range calendar, i.e. its Calendar with `mode="range"`
// (react-day-picker: `selected` / `onSelect` with `{ from, to }`, min / max, numberOfMonths,
// ... forwarded), named like @goopui/vue's GoopRangeCalendar. The goo is GoopCalendar's in
// range mode: the days of the range (and a hover preview while the end is being picked) fill
// as one gooey `band` that grows out day by day and drains from the far end; the start and end
// are primary goo caps landing with a small `pulse`; the month `slosh`es as it pages; the hover
// / keyboard-focus highlight is a goo `focus` wash. `goo={false}` is a plain shadcn Calendar.
import { forwardRef } from 'react'
import { GoopCalendar, type GoopCalendarProps } from '../calendar/GoopCalendar'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** GoopCalendar's range-mode props, without `mode`. */
export type GoopRangeCalendarProps = DistributiveOmit<Extract<GoopCalendarProps, { mode: 'range' }>, 'mode'>

export const GoopRangeCalendar = forwardRef<HTMLDivElement, GoopRangeCalendarProps>(function GoopRangeCalendar(props, ref) {
  return <GoopCalendar ref={ref} {...({ ...props, mode: 'range' } as GoopCalendarProps)} />
})
GoopRangeCalendar.displayName = 'GoopRangeCalendar'

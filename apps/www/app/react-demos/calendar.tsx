/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the Calendar and Range Calendar docs pages: real @goopui/react calendars
// (react-day-picker). Each set mirrors its Vue twin (components/content/Demo{Calendar,
// RangeCalendar}.vue) so the two pages compare 1:1; keep them (and the code samples in the
// markdown) in sync. Islands render on the client only, so today's date is safe here.
import { GoopCalendar, GoopRangeCalendar } from '@goopui/react'
import { useState } from 'react'
/** react-day-picker's DateRange. */
type DateRange = { from: Date | undefined; to?: Date | undefined }

type Pg = Record<string, Record<string, unknown>>

const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const today = (): Date => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function CalendarDemo({ set, pg }: { set: string; pg: Pg }) {
  const [now] = useState(today)
  const [date, setDate] = useState<Date | undefined>(now)
  const [other, setOther] = useState<Date | undefined>(() => addDays(now, 2))
  const [plain, setPlain] = useState<Date | undefined>(now)
  if (set === 'states')
    return (
      <div className="flex flex-wrap items-start justify-center gap-4">
        <GoopCalendar
          mode="single"
          selected={other}
          onSelect={setOther}
          className="rounded-lg border"
          preset="wild"
          disabled={(d) => d.getDate() % 7 === 0}
        />
        <GoopCalendar mode="single" selected={plain} onSelect={setPlain} className="rounded-lg border" goo={false} />
      </div>
    )
  return <GoopCalendar mode="single" selected={date} onSelect={setDate} className="rounded-lg border" {...pg.main} />
}

export function RangeCalendarDemo({ set, pg }: { set: string; pg: Pg }) {
  const [now] = useState(today)
  const [range, setRange] = useState<DateRange | undefined>(() => ({ from: now, to: addDays(now, 6) }))
  const [trip, setTrip] = useState<DateRange | undefined>(() => ({ from: addDays(now, 3), to: addDays(now, 17) }))
  const [plain, setPlain] = useState<DateRange | undefined>(() => ({ from: now, to: addDays(now, 4) }))
  if (set === 'months') return <GoopRangeCalendar selected={trip} onSelect={setTrip} className="rounded-lg border" numberOfMonths={2} />
  if (set === 'states') return <GoopRangeCalendar selected={plain} onSelect={setPlain} className="rounded-lg border" goo={false} />
  return <GoopRangeCalendar selected={range} onSelect={setRange} className="rounded-lg border" {...pg.main} />
}

---
'@goopui/core': minor
'@goopui/react': minor
---

React Calendar and Range Calendar. Core: `CALENDAR_DAYPICKER_DAYS` (pass as `attachCalendar`'s `days`) reads react-day-picker's day grid as shadcn/ui renders it, plus `CALENDAR_DAYPICKER_CELL` and `CALENDAR_PREVIEW_ATTR`. React: `GoopCalendar` (shadcn/ui's Calendar on react-day-picker, with `GoopCalendarDayButton`) and `GoopRangeCalendar` (`mode="range"`), with the same goo props as Vue (`flow`, `pulse`, `band`, `slosh`, `focus`, `textFollow`, `speed`, `preset`, `renderer`, `goo`) and a hover preview band while the range's end is picked. `react-day-picker` is a new dependency of `@goopui/react`.

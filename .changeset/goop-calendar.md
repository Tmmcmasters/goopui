---
'@goopui/core': minor
'@goopui/vue': minor
---

Calendar and Range Calendar. Core: `attachCalendar` (selection goo that flows from day to day with a landing pulse, a range band that merges across a week and grows / drains day by day, a gentle month-paging slosh, a goo hover / focus wash; every effect toggleable, static under reduced motion). The day grid is read through `CalendarDays` (reka-ui by default), so other headless calendars can drive it. `attachToggleSet` and the toggle engine's `filledAttr` / `grow` config. Vue: `GoopCalendar` and `GoopRangeCalendar` with every shadcn-vue part, on reka-ui.

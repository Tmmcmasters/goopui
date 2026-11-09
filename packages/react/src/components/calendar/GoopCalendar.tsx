'use client'
// GoopCalendar: shadcn/ui's Calendar (react-day-picker DayPicker: `mode` single | multiple |
// range, `selected` / `onSelect`, `month` / `onMonthChange`, locale, numberOfMonths, disabled,
// captionLayout, buttonVariant, `classNames` / `components` merge, ... forwarded; the same
// classes and CalendarDayButton). After mount core's `attachCalendar` adds the goo, on
// aria-hidden layers under the real day buttons:
//   - the selected day is a goo fill; picking another day makes it `flow` there (gather, neck,
//     pinch off, travel, flood in from the side it arrives on) and land with a small `pulse`;
//   - mode="range" (GoopRangeCalendar): the days of the range (and a hover preview while the
//     end is being picked) fill as one gooey `band`; the start and end are primary goo caps;
//   - paging the month gives the days a gentle `slosh` the way the month moved;
//   - the hover / keyboard-focus highlight is a goo `focus` wash gliding between days.
// The selected day's label colour follows the goo (`textFollow`). Every effect is a prop;
// `goo={false}` (and SSR, until hydration) is a plain shadcn Calendar. Reduced motion: static
// fills, the wash snaps, no slosh.
//
// Unlike shadcn's file, the custom day-picker components are module-level (not inline arrows),
// so a re-render keeps the same DOM: the engine follows days across selections.
import { CALENDAR_DAYPICKER_DAYS, CALENDAR_PREVIEW_ATTR, attachCalendar, type CalendarHandle, type CalendarOptions } from '@goopui/core'
import { cn } from 'cn'
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefCallback,
} from 'react'
import {
  DayPicker,
  getDefaultClassNames,
  type ChevronProps,
  type DateRange,
  type DayButtonProps,
  type DayPickerProps,
  type Locale,
  type RootProps,
  type WeekNumberProps,
} from 'react-day-picker'
import { useGoopConfig } from '../../config'
import { CALENDAR_PROP_KEYS, splitProps, toCalendarOptions, type GoopCalendarProps as GoopCalendarEngineProps, type GoopSoundProps } from '../../goop-props'
import { GoopSoundScope, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs } from '../../utils'
import { buttonVariants, type ButtonVariant } from '../button/variants'
import {
  CALENDAR,
  CALENDAR_CAPTION_LABEL,
  CALENDAR_CAPTION_LABEL_DROPDOWN,
  CALENDAR_CAPTION_LABEL_TEXT,
  CALENDAR_CLASS_NAMES,
  CALENDAR_DAY,
  CALENDAR_DAY_BUTTON,
  CALENDAR_DAY_FIRST,
  CALENDAR_DAY_FIRST_WEEK_NUMBER,
  CALENDAR_WEEK_NUMBER_INNER,
} from './variants'

/** The custom modifier of the range's hover preview (a day between the start and the hovered
 *  day while the end is being picked). */
const PREVIEW = 'goop_preview'

/** What GoopCalendar tells its module-level day-picker parts. */
interface CalendarContextValue {
  rootRef: RefCallback<HTMLDivElement>
  host: string | undefined
  locale: Partial<Locale> | undefined
  /** Range, while the end is being picked: a day was hovered / focused (null: left). */
  onPreview: ((day: Date | null) => void) | null
}
const CalendarContext = createContext<CalendarContextValue | null>(null)

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type OwnProps = GoopCalendarEngineProps &
  GoopSoundProps & {
    /** The prev / next buttons' variant (shadcn's `buttonVariant`). Default 'ghost'. */
    buttonVariant?: ButtonVariant
    /** Receives the live calendar handle (null before mount / when goo is off). */
    goopRef?: Ref<CalendarHandle>
  }

export type GoopCalendarProps = DistributiveOmit<DayPickerProps, keyof OwnProps> & OwnProps

const sameDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const dayKey = (d: Date | undefined | null): string | null =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null
/** Core's `value` (a change re-reads the days): a stable key of the selection. */
function selectionKey(mode: DayPickerProps['mode'], selected: unknown): unknown {
  if (!selected) return selected ?? null
  if (mode === 'range') {
    const r = selected as DateRange
    return [dayKey(r.from), dayKey(r.to)]
  }
  if (mode === 'multiple') return (selected as Date[]).map(dayKey)
  return dayKey(selected as Date)
}

export const GoopCalendar = forwardRef<HTMLDivElement, GoopCalendarProps>(function GoopCalendar(allProps, ref) {
  const [engine, props] = splitProps(allProps as GoopCalendarProps & GoopCalendarEngineProps, CALENDAR_PROP_KEYS)
  const {
    className,
    classNames,
    showOutsideDays = true,
    captionLayout = 'label',
    buttonVariant = 'ghost',
    locale,
    formatters,
    components,
    modifiers,
    sound,
    goopRef,
    ...rest
  } = props as Omit<GoopCalendarProps, keyof GoopCalendarEngineProps>
  const mode = rest.mode
  const range = mode === 'range'
  const goo = engine.goo !== false

  // The selection, as react-day-picker keeps it: controlled with `onSelect`, else `selected` is
  // only the initial value. goopUI holds it either way (core and the range preview read it).
  const pick = rest as { selected?: unknown; onSelect?: (...args: unknown[]) => void }
  const [inner, setInner] = useState<unknown>(pick.selected)
  const [hovered, setHovered] = useState<Date | null>(null)
  const selected = pick.onSelect ? pick.selected : inner
  const onSelect = (...args: unknown[]): void => {
    if (!pick.onSelect) setInner(args[0])
    // The picked day is where the pointer is: the preview starts from there, never from a day
    // hovered before the pick.
    if (range) setHovered((args[1] as Date | undefined) ?? null)
    pick.onSelect?.(...args)
  }

  const el = useRef<HTMLDivElement | null>(null)
  const rootRef = useComposedRefs(ref, el)
  const config = useGoopConfig()
  const on = useGoopSound(sound)
  const base = toCalendarOptions(engine, config)
  const options: CalendarOptions | null = base && { ...base, range, value: selectionKey(mode, selected), days: CALENDAR_DAYPICKER_DAYS }
  const handle = useAttached(el, attachCalendar, options as CalendarOptions, goo)
  useImperativeHandle(goopRef, () => handle as CalendarHandle, [handle])
  const active = handle !== null

  // Range: while the end is being picked (react-day-picker's first click makes a one-day range),
  // the days from the start to the hovered / focused day are the band's preview. Only with the
  // goo attached (shadcn has no preview), so SSR markup stays shadcn's.
  const r = range ? (selected as DateRange | undefined) : undefined
  const picking = active && engine.band !== false && engine.band !== 0 && !!r?.from && (!r.to || sameDay(r.from, r.to))
  const preview =
    picking && hovered && r?.from && !sameDay(hovered, r.from) ? (hovered < r.from ? { from: hovered, to: r.from } : { from: r.from, to: hovered }) : undefined
  const onPreview = useMemo(() => (picking ? (d: Date | null) => setHovered((prev) => (prev && d && sameDay(prev, d)) || prev === d ? prev : d) : null), [picking])

  const defaultClassNames = getDefaultClassNames()
  const ctx = useMemo<CalendarContextValue>(
    () => ({ rootRef, host: goo ? (range ? 'range-calendar' : 'calendar') : undefined, locale, onPreview }),
    [rootRef, goo, range, locale, onPreview],
  )
  const picker = {
    ...rest,
    ...(mode ? { selected, onSelect } : {}),
    modifiers: preview ? { ...modifiers, [PREVIEW]: preview } : modifiers,
  } as DayPickerProps

  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <CalendarContext.Provider value={ctx}>
        <DayPicker
          showOutsideDays={showOutsideDays}
          className={cn(CALENDAR, className)}
          captionLayout={captionLayout}
          locale={locale}
          formatters={{
            formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: 'short' }),
            ...formatters,
          }}
          classNames={{
            root: cn(CALENDAR_CLASS_NAMES.root, defaultClassNames.root),
            months: cn(CALENDAR_CLASS_NAMES.months, defaultClassNames.months),
            month: cn(CALENDAR_CLASS_NAMES.month, defaultClassNames.month),
            nav: cn(CALENDAR_CLASS_NAMES.nav, defaultClassNames.nav),
            button_previous: cn(buttonVariants({ variant: buttonVariant }), CALENDAR_CLASS_NAMES.button_previous, defaultClassNames.button_previous),
            button_next: cn(buttonVariants({ variant: buttonVariant }), CALENDAR_CLASS_NAMES.button_next, defaultClassNames.button_next),
            month_caption: cn(CALENDAR_CLASS_NAMES.month_caption, defaultClassNames.month_caption),
            dropdowns: cn(CALENDAR_CLASS_NAMES.dropdowns, defaultClassNames.dropdowns),
            dropdown_root: cn(CALENDAR_CLASS_NAMES.dropdown_root, defaultClassNames.dropdown_root),
            dropdown: cn(CALENDAR_CLASS_NAMES.dropdown, defaultClassNames.dropdown),
            caption_label: cn(
              CALENDAR_CAPTION_LABEL,
              captionLayout === 'label' ? CALENDAR_CAPTION_LABEL_TEXT : CALENDAR_CAPTION_LABEL_DROPDOWN,
              defaultClassNames.caption_label,
            ),
            month_grid: cn(CALENDAR_CLASS_NAMES.month_grid, defaultClassNames.month_grid),
            weekdays: cn(CALENDAR_CLASS_NAMES.weekdays, defaultClassNames.weekdays),
            weekday: cn(CALENDAR_CLASS_NAMES.weekday, defaultClassNames.weekday),
            week: cn(CALENDAR_CLASS_NAMES.week, defaultClassNames.week),
            week_number_header: cn(CALENDAR_CLASS_NAMES.week_number_header, defaultClassNames.week_number_header),
            week_number: cn(CALENDAR_CLASS_NAMES.week_number, defaultClassNames.week_number),
            day: cn(CALENDAR_DAY, rest.showWeekNumber ? CALENDAR_DAY_FIRST_WEEK_NUMBER : CALENDAR_DAY_FIRST, defaultClassNames.day),
            range_start: cn(CALENDAR_CLASS_NAMES.range_start, defaultClassNames.range_start),
            range_middle: cn(CALENDAR_CLASS_NAMES.range_middle, defaultClassNames.range_middle),
            range_end: cn(CALENDAR_CLASS_NAMES.range_end, defaultClassNames.range_end),
            today: cn(CALENDAR_CLASS_NAMES.today, defaultClassNames.today),
            outside: cn(CALENDAR_CLASS_NAMES.outside, defaultClassNames.outside),
            disabled: cn(CALENDAR_CLASS_NAMES.disabled, defaultClassNames.disabled),
            hidden: cn(CALENDAR_CLASS_NAMES.hidden, defaultClassNames.hidden),
            ...classNames,
          }}
          components={{
            Root: CalendarRoot,
            Chevron: CalendarChevron,
            DayButton: CalendarDayButtonWithLocale,
            WeekNumber: CalendarWeekNumber,
            ...components,
          }}
          {...picker}
        />
      </CalendarContext.Provider>
    </GoopSoundScope>
  )
})
GoopCalendar.displayName = 'GoopCalendar'

/** The calendar root (`data-slot="calendar"`): the goo host. */
function CalendarRoot({ className, rootRef, ...props }: RootProps) {
  const ctx = useContext(CalendarContext)
  const ref = useComposedRefs(rootRef, ctx?.rootRef)
  const onPointerLeave = (e: ReactPointerEvent<HTMLDivElement>): void => {
    ctx?.onPreview?.(null)
    props.onPointerLeave?.(e)
  }
  return <div data-slot="calendar" data-goop-host={ctx?.host} ref={ref} className={cn(className)} {...props} onPointerLeave={onPointerLeave} />
}

/** lucide's ChevronLeft / ChevronRight / ChevronDown (shadcn's Chevron). */
function CalendarChevron({ className, orientation, size: _size, disabled: _disabled, ...props }: ChevronProps) {
  const d = orientation === 'left' ? 'm15 18-6-6 6-6' : orientation === 'right' ? 'm9 18 6-6-6-6' : 'm6 9 6 6 6-6'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(orientation === 'left' || orientation === 'right' ? 'cn-rtl-flip size-4' : 'size-4', className)}
      {...props}
    >
      <path d={d} />
    </svg>
  )
}

function CalendarWeekNumber({ children, week: _week, ...props }: WeekNumberProps) {
  return (
    <td {...props}>
      <div className={CALENDAR_WEEK_NUMBER_INNER}>{children}</div>
    </td>
  )
}

function CalendarDayButtonWithLocale(props: DayButtonProps) {
  const ctx = useContext(CalendarContext)
  return <GoopCalendarDayButton locale={ctx?.locale} {...props} />
}

export type GoopCalendarDayButtonProps = DayButtonProps & { locale?: Partial<Locale> }

/** shadcn/ui's CalendarDayButton: a ghost icon Button with the day's range state as data
 *  attributes (core reads them). Inside a GoopRangeCalendar picking its end, it also marks the
 *  hover preview (`data-range-preview`) and reports hover / focus. */
export function GoopCalendarDayButton({ className, day, modifiers, locale, ...props }: GoopCalendarDayButtonProps) {
  const defaultClassNames = getDefaultClassNames()
  const ctx = useContext(CalendarContext)
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])
  const onPreview = ctx?.onPreview
  const preview = onPreview
    ? {
        [CALENDAR_PREVIEW_ATTR]: modifiers[PREVIEW] === true,
        // Touch has no hover: a tap must not leave a preview behind.
        onPointerEnter: (e: ReactPointerEvent<HTMLButtonElement>) => {
          if (e.pointerType !== 'touch') onPreview(day.date)
          props.onPointerEnter?.(e)
        },
        onFocus: (e: Parameters<NonNullable<ComponentProps<'button'>['onFocus']>>[0]) => {
          onPreview(day.date)
          props.onFocus?.(e)
        },
      }
    : null
  return (
    <button
      ref={ref}
      data-slot="button"
      data-variant="ghost"
      data-size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), CALENDAR_DAY_BUTTON, defaultClassNames.day, className)}
      {...props}
      {...preview}
    />
  )
}

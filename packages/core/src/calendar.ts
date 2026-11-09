// Calendar goo (GoopCalendar, GoopRangeCalendar): a day grid with goo selection.
//
// Three goo layers on the calendar root, all aria-hidden and under the real day buttons:
//   focus (wash): the hover / keyboard-focus highlight is one goo blob (the menu highlight
//     engine) that glides from day to day with momentum, so arrow-key navigation visibly
//     moves the goo.
//   band (range only): the days between start and end (and the hover preview while the end
//     is being picked) fill as one goo body. Neighbouring days in a row merge through goo
//     bridges (toggle group `merge`); a week ends in a soft round end and the band carries on
//     from the start of the next row. Extending the range grows it day by day out of the band
//     (`grow`), shrinking it drains the far end first.
//   selection: the selected day (or the range's start and end) is a toggle-group fill. In a
//     single calendar picking a new day makes the goo flow from the old day to the new one:
//     it gathers, necks out, pinches off, travels and floods the new day from the side it
//     arrives on, with a small jelly pulse once it lands. Its label colour follows the goo.
// Paging months (buttons, PageUp/Down, or arrowing off the end of a month) gives the grid's
// days a gentle slosh in the paging direction: each column swings a few px the way the
// month moved and springs back, in a wave from the leading side (`calendarSloshOffset`).
//
// The grid is read through `CalendarDays` (default: reka-ui's data attributes;
// `CALENDAR_DAYPICKER_DAYS` reads react-day-picker's), so either headless calendar drives the
// same engine.
//
// Every shape is the toggle / menu engines' pure poses; the slosh is a pure function of time.
// Reduced motion: static fills, the highlight snaps, no slosh. No DOM access until
// `attachCalendar` runs (SSR-safe).

import type { GoopPreset } from './constants'
import { decayWobble } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { MENU_CONTAINER_ATTR, attachMenuHighlight, type MenuHighlightHandle } from './menu'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { GOOP_PART_ATTR } from './renderer'
import type { GoopRendererOption } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { attachToggleSet, type ToggleHandle } from './toggle'
import { readPreset } from './tuning'

/** Calendar effects, each a prop in the adapters. All default true. */
export const CALENDAR_EFFECTS = ['flow', 'pulse', 'band', 'slosh', 'focus'] as const
export type CalendarEffect = (typeof CALENDAR_EFFECTS)[number]

/** Selector of reka's day buttons (`CalendarCellTrigger` / `RangeCalendarCellTrigger`). */
export const CALENDAR_CELL = '[data-reka-calendar-cell-trigger]'
/** Set on a day while its selection goo shows. */
export const CALENDAR_FILLED_ATTR = 'data-goop-filled'
/** Set on a day while its range band goo shows. */
export const CALENDAR_BANDED_ATTR = 'data-goop-banded'
/** Set on a day while the month slosh moves it (its `translate` is the engine's). */
export const CALENDAR_SLOSH_ATTR = 'data-goop-slosh'
/** Set on the calendar root while the engine is attached. */
export const CALENDAR_ATTR = 'data-goop-calendar'
/** Set on the calendar root while the range band layer is attached. */
export const CALENDAR_BAND_ATTR = 'data-goop-band'
/** Set on the calendar root while the focus wash is attached. */
export const CALENDAR_FOCUS_ATTR = 'data-goop-focus'
/** CSS var the selection goo paints with (default `--primary`). */
export const CALENDAR_SELECTED_VAR = '--goop-calendar-selected'
/** CSS var of a selected day's label where the goo covers it (default `--primary-foreground`). */
export const CALENDAR_TEXT_VAR = '--goop-calendar-text'
/** CSS var the range band paints with (default `--accent`). */
export const CALENDAR_RANGE_VAR = '--goop-calendar-range'

/**
 * How the engine reads the day grid. The default (`CALENDAR_REKA_DAYS`) reads reka's Calendar /
 * RangeCalendar; another headless calendar (react-day-picker, ...) passes its own.
 */
export interface CalendarDays {
  /** Selector of the day buttons, in reading order (DOM order = day order). */
  cell: string
  /** Single calendar: the selected day. Range calendar: every day in the range (caps too). */
  isSelected: (el: Element) => boolean
  /** Range calendar: the range's first or last day (the primary caps). */
  isCap: (el: Element) => boolean
  /** Range calendar: in the hover preview while the end is being picked. */
  isPreview: (el: Element) => boolean
  /** Not pickable (the focus wash skips it). */
  isDisabled: (el: Element) => boolean
  /** A key of the month in view; when it changes the grid sloshes. ISO-like keys
   *  ('2026-11-01') compare as strings for the direction (`calendarPageDirection`). */
  month: (host: HTMLElement) => string | null
  /** Attributes whose changes may flip isSelected / isCap / isPreview. */
  attrs: readonly string[]
}

/** reka-ui's day grid (the default `CalendarOptions.days`). */
export const CALENDAR_REKA_DAYS: Readonly<CalendarDays> = Object.freeze({
  cell: CALENDAR_CELL,
  isSelected: (el: Element) => el.hasAttribute('data-selected'),
  isCap: (el: Element) => el.hasAttribute('data-selection-start') || el.hasAttribute('data-selection-end'),
  isPreview: (el: Element) => el.hasAttribute('data-highlighted'),
  isDisabled: (el: Element) => el.hasAttribute('data-disabled'),
  month: (host: HTMLElement) =>
    host.querySelector(`${CALENDAR_CELL}:not([${GOOP_PART_ATTR}]):not([data-outside-view])`)?.getAttribute('data-value') ?? null,
  attrs: Object.freeze(['data-selected', 'data-selection-start', 'data-selection-end', 'data-highlighted']),
})

/** Selector of react-day-picker's day buttons: the `<button>` in each day cell (`<td data-day>`). */
export const CALENDAR_DAYPICKER_CELL = 'td[data-day] > button'
/** Set (by the adapter's day button) on a day in the range's hover preview while the end is
 *  being picked; react-day-picker has no preview of its own. */
export const CALENDAR_PREVIEW_ATTR = 'data-range-preview'
const isTrue = (el: Element | null | undefined, attr: string): boolean => el?.getAttribute(attr) === 'true'

/**
 * react-day-picker's day grid (v9 / v10) as shadcn/ui's Calendar renders it: the day `<td>`
 * carries `data-day` (ISO date), `data-selected`, `data-disabled` and `data-outside`; shadcn's
 * `CalendarDayButton` marks the range caps `data-range-start` / `data-range-end`; the adapter
 * marks the hover preview `data-range-preview`. Booleans are React's "true" / "false".
 */
export const CALENDAR_DAYPICKER_DAYS: Readonly<CalendarDays> = Object.freeze({
  cell: CALENDAR_DAYPICKER_CELL,
  isSelected: (el: Element) => isTrue(el.parentElement, 'data-selected'),
  isCap: (el: Element) => isTrue(el, 'data-range-start') || isTrue(el, 'data-range-end'),
  isPreview: (el: Element) => isTrue(el, CALENDAR_PREVIEW_ATTR),
  isDisabled: (el: Element) => (el as HTMLButtonElement).disabled === true || isTrue(el.parentElement, 'data-disabled'),
  month: (host: HTMLElement) => {
    for (const td of Array.from(host.querySelectorAll('td[data-day]:not([data-outside])'))) {
      if (!td.closest(`[${GOOP_PART_ATTR}]`)) return td.getAttribute('data-day')
    }
    return null
  },
  attrs: Object.freeze(['data-selected', 'data-range-start', 'data-range-end', CALENDAR_PREVIEW_ATTR]),
})

export interface CalendarFeel {
  /** Peak sideways swing of a day when the month pages, px. */
  slosh: number
  /** Seconds the slosh wave takes to cross one column. */
  stagger: number
  /** Seconds until a day's slosh has settled. */
  settle: number
  /** Slosh oscillations per second. */
  freq: number
  /** Seconds per day as the range band grows / drains. */
  grow: number
}

export const CALENDAR_FEEL: Readonly<Record<GoopPreset, Readonly<CalendarFeel>>> = Object.freeze({
  subtle: Object.freeze({ slosh: 2.5, stagger: 0.018, settle: 0.5, freq: 1.9, grow: 0.018 }),
  playful: Object.freeze({ slosh: 4, stagger: 0.024, settle: 0.62, freq: 1.7, grow: 0.026 }),
  wild: Object.freeze({ slosh: 6.5, stagger: 0.03, settle: 0.8, freq: 1.5, grow: 0.034 }),
})

// decayWobble's first peak (damping 5) is ~0.45 of its amplitude: scale it so `slosh` is the peak.
const SLOSH_DAMPING = 5
const SLOSH_NORM = 1 / 0.45

/**
 * Sideways offset (px) of a day in column `col` (of `cols`) and week `row`, `t` seconds after
 * the month paged in direction `dir` (+1: forward, -1: back). The days swing the way the month
 * moved (forward: left) and spring back, in a wave that starts at the leading side (forward:
 * the right-hand column) and rolls across; lower weeks trail a little. 0 before the wave reaches
 * the day and once it has settled. `strength` scales it (0 = off). Pure.
 */
export function calendarSloshOffset(
  t: number,
  col: number,
  row: number,
  cols: number,
  dir: number,
  feel: CalendarFeel = CALENDAR_FEEL.playful,
  strength = 1,
): number {
  if (!(strength > 0) || !dir) return 0
  const lead = dir > 0 ? cols - 1 - col : col
  const a = t - feel.stagger * (lead + row * 0.35)
  if (a <= 0) return 0
  return -Math.sign(dir) * feel.slosh * strength * SLOSH_NORM * decayWobble(a, feel.freq, SLOSH_DAMPING, feel.settle)
}

/** Seconds from a page until every day of a `cols` x `rows` grid has settled. */
export function calendarSloshEnd(cols: number, rows: number, feel: CalendarFeel = CALENDAR_FEEL.playful): number {
  return feel.stagger * (Math.max(0, cols - 1) + Math.max(0, rows - 1) * 0.35) + feel.settle
}

/** Paging direction between two visible months, from their month keys (ISO 'YYYY-MM...'). */
export function calendarPageDirection(prev: string | null, next: string | null): number {
  if (!prev || !next) return 0
  const a = prev.slice(0, 7)
  const b = next.slice(0, 7)
  if (a === b) return 0
  return b > a ? 1 : -1
}

export interface CalendarOptions {
  /** A range calendar: band + start / end caps. Default false. */
  range?: boolean
  /** The selected value. Any change re-reads the days from the DOM. */
  value?: unknown
  /** Selection goo flows from the old day to the new one (false: drains / floods in place). */
  flow?: boolean | number
  /** Small jelly pulse as the selection lands. */
  pulse?: boolean | number
  /** Range: the days in the range fill as one gooey band (false: the flat cell bg). */
  band?: boolean | number
  /** Paging the month sloshes the days in the paging direction. */
  slosh?: boolean | number
  /** Hover / keyboard focus highlight is a goo blob gliding between days (false: flat hover bg). */
  focus?: boolean | number
  /** A selected day's label colour follows the goo's edge. Default true. */
  textFollow?: boolean
  /** How to read the day grid. Default reka's (`CALENDAR_REKA_DAYS`); fields left out keep
   *  reka's. Read once, when the engine attaches. */
  days?: Partial<CalendarDays>
  speed?: number
  preset?: GoopPreset
  renderer?: GoopRendererOption
  reducedMotion?: boolean | 'auto'
}

export interface CalendarHandle {
  update(opts?: CalendarOptions): void
  resize(): void
  /** Play the month slosh (the engine does this itself when the visible month changes). */
  page(dir: number): void
  readonly reducedMotion: boolean
  /** True while anything animates. */
  readonly running: boolean
  readonly sloshing: boolean
  readonly selection: ToggleHandle | null
  readonly band: ToggleHandle | null
  readonly focus: MenuHighlightHandle | null
  destroy(): void
}

/** The day the highlight sits on: the keyboard-focused day, else the hovered one. */
function focusTarget(host: HTMLElement, hovered: Element | null, dom: CalendarDays): Element | null {
  const active = host.ownerDocument.activeElement
  if (active && active !== host && host.contains(active) && active.matches(dom.cell)) {
    let visible = true
    try {
      visible = active.matches(':focus-visible')
    } catch {
      visible = true
    }
    if (visible) return active
  }
  if (hovered && hovered.isConnected && host.contains(hovered) && !dom.isDisabled(hovered)) return hovered
  return null
}

/**
 * Attach the calendar goo to a calendar root `host` (reka CalendarRoot / RangeCalendarRoot):
 * the selection fill (flow + pulse), the range band, the focus highlight and the month slosh.
 * Makes the host `position: relative` and isolated; marks it `data-goop-calendar`.
 */
export function attachCalendar(host: HTMLElement, options: CalendarOptions = {}): CalendarHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: CalendarOptions = { ...options }
  const dom: CalendarDays = { ...CALENDAR_REKA_DAYS, ...options.days }
  let feel = CALENDAR_FEEL[readPreset(host, opts.preset)]
  let destroyed = false
  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  // Every day is an item of both fill engines, not only the selected ones: a day must already
  // be known while off for its turning on to count as a change (a flood, a flow), and the band
  // grows / drains in day order. Days the goo doesn't reach draw nothing.
  const days = (): HTMLElement[] =>
    Array.from(host.querySelectorAll<HTMLElement>(dom.cell)).filter((el) => !el.closest(`[${GOOP_PART_ATTR}]`))
  const isInBand = (el: Element): boolean => dom.isSelected(el) || dom.isPreview(el) || dom.isCap(el)

  let selection: ToggleHandle | null = null
  let band: ToggleHandle | null = null
  let focus: MenuHighlightHandle | null = null
  let hovered: Element | null = null

  const common = (): Pick<CalendarOptions, 'speed' | 'preset' | 'renderer' | 'reducedMotion'> => ({
    speed: opts.speed,
    preset: opts.preset,
    renderer: opts.renderer,
    reducedMotion: opts.reducedMotion,
  })
  const selectionOptions = () => ({
    ...common(),
    value: opts.value,
    flood: true,
    wobble: gooEffectValue(opts.pulse),
    droplets: false,
    flow: opts.range ? 0 : gooEffectValue(opts.flow),
    merge: true,
    textFollow: opts.textFollow,
  })
  const bandOptions = () => ({
    ...common(),
    value: opts.value,
    flood: true,
    wobble: 0,
    droplets: false,
    flow: 0,
    merge: true,
    textFollow: false,
  })
  const bandOn = (): boolean => opts.range === true && gooEffectValue(opts.band) > 0
  const focusOn = (): boolean => gooEffectValue(opts.focus) > 0

  const attachBand = (): void => {
    if (band || !bandOn()) return
    band = attachToggleSet(host, days, bandOptions(), {
      part: 'calendar-band',
      color: `var(${CALENDAR_RANGE_VAR}, var(--accent, currentColor))`,
      isOn: isInBand,
      attrs: [...dom.attrs],
      filledAttr: CALENDAR_BANDED_ATTR,
      textColor: null,
      grow: feel.grow,
    })
    host.setAttribute(CALENDAR_BAND_ATTR, '')
  }
  const attachSelection = (): void => {
    if (selection) return
    selection = attachToggleSet(host, days, selectionOptions(), {
      part: 'calendar-selection',
      color: `var(${CALENDAR_SELECTED_VAR}, var(--primary, currentColor))`,
      isOn: opts.range ? dom.isCap : dom.isSelected,
      attrs: [...dom.attrs],
      filledAttr: CALENDAR_FILLED_ATTR,
      textColor: `var(${CALENDAR_TEXT_VAR}, var(--primary-foreground, currentColor))`,
    })
  }
  const attachFocus = (): void => {
    if (focus || !focusOn()) return
    focus = attachMenuHighlight(host, {
      ...common(),
      find: () => focusTarget(host, hovered, dom),
      followPointer: false,
      pop: false,
    })
    // The highlight engine marks its container as a menu; the calendar root is not one.
    host.removeAttribute(MENU_CONTAINER_ATTR)
    host.setAttribute(CALENDAR_FOCUS_ATTR, '')
  }
  const detachSelection = (): void => {
    selection?.destroy()
    selection = null
    for (const el of days()) el.removeAttribute(CALENDAR_FILLED_ATTR)
  }
  const detachBand = (): void => {
    band?.destroy()
    band = null
    host.removeAttribute(CALENDAR_BAND_ATTR)
    for (const el of days()) el.removeAttribute(CALENDAR_BANDED_ATTR)
  }
  const detachFocus = (): void => {
    focus?.destroy()
    focus = null
    host.removeAttribute(CALENDAR_FOCUS_ATTR)
  }

  const prevPosition = host.style.position
  const prevIsolation = host.style.isolation
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'
  host.setAttribute(CALENDAR_ATTR, '')

  // Layer order (each is z-index -1, later is on top): focus wash, band, selection.
  attachFocus()
  attachBand()
  attachSelection()

  // ---- month slosh ----
  let slosh: { start: number; dir: number; cells: { el: HTMLElement; col: number; row: number }[]; cols: number; rows: number } | null = null
  let now = 0
  const sloshStrength = (): number => gooEffectValue(opts.slosh)

  const follow = (): void => {
    selection?.resize()
    band?.resize()
    focus?.refresh()
  }
  const clearSlosh = (): void => {
    if (!slosh) return
    for (const c of slosh.cells) {
      c.el.style.translate = ''
      c.el.removeAttribute(CALENDAR_SLOSH_ATTR)
    }
    slosh = null
    follow()
  }
  const sloshTick: Ticker = (dt) => {
    if (destroyed || !slosh) return false
    now += dt * Math.max(0.05, opts.speed ?? 1)
    const t = now - slosh.start
    if (t >= calendarSloshEnd(slosh.cols, slosh.rows, feel)) {
      clearSlosh()
      return false
    }
    const k = sloshStrength()
    for (const c of slosh.cells) {
      const x = calendarSloshOffset(t, c.col, c.row, slosh.cols, slosh.dir, feel, k)
      c.el.style.translate = Math.abs(x) < 0.01 ? '' : `${x.toFixed(2)}px 0`
    }
    follow()
    return true
  }
  const page = (dir: number): void => {
    if (destroyed || !dir || reduced || !(sloshStrength() > 0)) return
    clearSlosh()
    const cells: { el: HTMLElement; col: number; row: number }[] = []
    let cols = 1
    let rows = 1
    const rowIndex = new Map<Element, number>()
    for (const el of days()) {
      const cell = el.parentElement
      const tr = cell?.parentElement
      const col = cell && tr ? Array.prototype.indexOf.call(tr.children, cell) : 0
      let row = 0
      if (tr) {
        if (!rowIndex.has(tr)) rowIndex.set(tr, Array.prototype.indexOf.call(tr.parentElement?.children ?? [], tr))
        row = rowIndex.get(tr)!
      }
      cols = Math.max(cols, col + 1)
      rows = Math.max(rows, row + 1)
      el.setAttribute(CALENDAR_SLOSH_ATTR, '')
      cells.push({ el, col: Math.max(0, col), row: Math.max(0, row) })
    }
    slosh = { start: now, dir: Math.sign(dir), cells, cols, rows }
    wakeTicker(sloshTick)
  }

  let shown = dom.month(host)
  const onMutate = (): void => {
    if (destroyed) return
    const next = dom.month(host)
    if (next === shown) return
    const dir = calendarPageDirection(shown, next)
    shown = next
    if (dir) page(dir)
  }
  const MO = win?.MutationObserver
  const mo = MO ? new MO(onMutate) : undefined
  mo?.observe(host, { childList: true, subtree: true })

  // ---- focus targets ----
  const onOver = (e: Event): void => {
    // Touch has no hover: a tap must not leave the wash behind (sticky hover).
    if ((e as PointerEvent).pointerType === 'touch') return
    const t = e.target as Element | null
    const cell = t?.closest?.(dom.cell) ?? null
    const next = cell && !cell.closest(`[${GOOP_PART_ATTR}]`) ? cell : null
    if (next === hovered) return
    hovered = next
    focus?.refresh()
  }
  const onLeave = (): void => {
    hovered = null
    focus?.refresh()
  }
  const onFocusChange = (): void => {
    focus?.refresh()
  }
  host.addEventListener('pointerover', onOver)
  host.addEventListener('pointerleave', onLeave)
  host.addEventListener('focusin', onFocusChange)
  host.addEventListener('focusout', onFocusChange)
  // Focus moves by keyboard inside the calendar's handlers; read it after they ran.
  const onKey = (): void => {
    queueMicrotask(() => focus?.refresh())
  }
  host.addEventListener('keydown', onKey)

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) {
      removeTicker(sloshTick)
      clearSlosh()
    }
  })

  return {
    update(next = {}) {
      if (destroyed) return
      const rangeChanged = 'range' in next && next.range !== opts.range
      const presetChanged = 'preset' in next && next.preset !== opts.preset
      opts = { ...opts, ...next }
      feel = CALENDAR_FEEL[readPreset(host, opts.preset)]
      reduced = readReduced()
      if (reduced || !(sloshStrength() > 0)) {
        removeTicker(sloshTick)
        clearSlosh()
      }
      if (rangeChanged) {
        detachSelection()
        detachBand()
      }
      if (focusOn()) {
        if (focus) focus.update(common())
        else attachFocus()
      } else detachFocus()
      // The band's grow pace comes from the preset: re-attach it when that changes.
      if (presetChanged && band) {
        detachSelection()
        detachBand()
      }
      if (bandOn()) {
        if (band) band.update(bandOptions())
        else {
          // Keep the layer order: the band sits under the selection.
          detachSelection()
          attachBand()
        }
      } else detachBand()
      if (selection) selection.update(selectionOptions())
      else attachSelection()
    },
    resize() {
      selection?.resize()
      band?.resize()
      focus?.refresh()
    },
    page,
    get reducedMotion() {
      return reduced
    },
    get running() {
      return slosh !== null || (selection?.running ?? false) || (band?.running ?? false)
    },
    get sloshing() {
      return slosh !== null
    },
    get selection() {
      return selection
    },
    get band() {
      return band
    },
    get focus() {
      return focus
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(sloshTick)
      clearSlosh()
      mo?.disconnect()
      unwatch()
      host.removeEventListener('pointerover', onOver)
      host.removeEventListener('pointerleave', onLeave)
      host.removeEventListener('focusin', onFocusChange)
      host.removeEventListener('focusout', onFocusChange)
      host.removeEventListener('keydown', onKey)
      detachSelection()
      detachBand()
      detachFocus()
      host.removeAttribute(CALENDAR_ATTR)
      host.style.position = prevPosition
      host.style.isolation = prevIsolation
    },
  }
}

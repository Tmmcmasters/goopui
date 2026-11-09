// Table row highlight (GoopTable): the body rows' hover background as ONE goo blob that glides
// from row to row as the pointer moves down the table, with a calm feel: a short rope, a gentle
// stretch, a soft landing and a low, wide swell under the pointer. It fades out when the
// pointer leaves the table. Opt-in (`selected`): when nothing is hovered the blob rests on the
// selected row (`data-state="selected"` / `aria-selected="true"`), so it is that row's fill too.
//
// It is the list highlight (`./list-highlight`, the menu highlight engine) over shadcn's
// TableBody rows, fed TABLE_FEEL. Two things differ from a plain list:
//   - A <tbody> can't hold the blob, and shadcn's table container scrolls sideways
//     (`overflow-x: auto`, so it clips and scrolls on both axes). The blob goes in an
//     aria-hidden clipping stage sized to the <table> (`overflow: clip`), so its padded goo
//     layer never adds to the container's scroll size and never shows outside the table.
//   - So the goo never meets that clip, the blob rides a rounded pill inset into the row
//     (TABLE_INSET px on each side). Header and footer rows are never lit.
// Touch never lights a row (no sticky hover). No DOM access until `attachTableHighlight` runs
// (SSR-safe). Reduced motion: the blob snaps to the row, no travel.

import type { GoopPreset } from './constants'
import type { EmergeRect } from './emerge'
import { attachListHighlight, type ListHighlightHandle } from './list-highlight'
import { MENU_FEEL, type MenuFeel, type MenuHighlightOptions } from './menu'

/** Table toggles, each a prop in the adapters. `highlight`, `wobble`, `momentum` and
 *  `followPointer` default true; `selected` (the blob rests on the selected row) is opt-in. */
export const TABLE_EFFECTS = ['highlight', 'wobble', 'momentum', 'followPointer', 'selected'] as const
export type TableEffect = (typeof TABLE_EFFECTS)[number]

const calm = (menu: Readonly<MenuFeel>): Readonly<MenuFeel> =>
  Object.freeze({
    ...menu,
    head: { response: menu.head.response, dampingRatio: Math.min(0.95, menu.head.dampingRatio + 0.15) },
    tail: { response: menu.tail.response, dampingRatio: Math.min(1, menu.tail.dampingRatio + 0.12) },
    lag: menu.lag * 0.6,
    stretch: menu.stretch * 0.5,
  })

/** Per-preset feel of the row blob: the menu highlight made calmer (rows are wide and a table
 *  is read, not played with), keeping the menu's pointer swell. */
export const TABLE_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = Object.freeze({
  subtle: calm(MENU_FEEL.subtle),
  playful: calm(MENU_FEEL.playful),
  wild: calm(MENU_FEEL.wild),
})

/** The rows the blob lights: shadcn's TableRow inside TableBody. */
export const TABLE_ROWS = '[data-slot="table-body"] > [data-slot="table-row"]'
/** A selected row (shadcn's `data-state="selected"`, or ARIA). */
export const TABLE_SELECTED = '[data-state="selected"], [aria-selected="true"]'
/** Set by core on the selected row while the blob rests on it (CSS drops its flat fill). */
export const TABLE_REST_ATTR = 'data-goop-rest'
/** How far the blob's pill sits inside the row, px (keeps the goo clear of the table edges). */
export const TABLE_INSET = Object.freeze({ x: 4, y: 2 })
/** The blob's corner radius (CSS). Override with `--goop-table-radius` on the table. */
export const TABLE_RADIUS = 'var(--goop-table-radius, calc(var(--radius, 0.625rem) - 2px))'
/** The aria-hidden clipping stage the blob lives in. */
export const TABLE_STAGE_PART = 'table-stage'

/** Row highlight options: the menu highlight's (feel defaults to TABLE_FEEL) plus `selected`. */
export type TableHighlightOptions = Omit<MenuHighlightOptions, 'find' | 'pop'> & {
  /** When nothing is hovered the blob rests on the selected row. Default false. */
  selected?: boolean
}

/** The row highlight handle (the menu highlight's, whose `update` takes the table options). */
export interface TableHighlightHandle extends Omit<ListHighlightHandle, 'update'> {
  update(opts?: TableHighlightOptions): void
}

/** A row rect inset into a pill (never inverted). Pure. */
export function tableRowRect(r: EmergeRect, inset: { x: number; y: number } = TABLE_INSET): EmergeRect {
  const ix = Math.min(inset.x, Math.max(0, r.width / 2 - 1))
  const iy = Math.min(inset.y, Math.max(0, r.height / 2 - 1))
  return { x: r.x + ix, y: r.y + iy, width: r.width - ix * 2, height: r.height - iy * 2 }
}

/** The first selected body row of `container` (the blob's resting row), or null. */
export function findTableSelected(container: Element): Element | null {
  for (const row of container.querySelectorAll(TABLE_ROWS)) {
    try {
      if (row.matches(TABLE_SELECTED)) return row
    } catch {
      return null
    }
  }
  return null
}

/**
 * Attach the goo row highlight to a table container (shadcn's `[data-slot="table-container"]`,
 * the scrolling <div> around the <table>). Lights the hovered (mouse / pen) body row; with
 * `selected` it rests on the selected row otherwise. The blob is colored by `--goop-color` on
 * the `[data-goop="highlight"]` element (inside the `[data-goop="table-stage"]` stage); while
 * attached the container carries `data-goop-menu`, so CSS can drop the rows' flat hover fill.
 */
export function attachTableHighlight(container: HTMLElement, options: TableHighlightOptions = {}): TableHighlightHandle {
  const doc = container.ownerDocument
  const win = doc.defaultView
  let opts: TableHighlightOptions = { ...options }
  let rest: Element | null = null

  // The stage: at the container's content origin, exactly the table's size, clipping.
  const stage = doc.createElement('span')
  stage.setAttribute('data-goop', TABLE_STAGE_PART)
  stage.setAttribute('aria-hidden', 'true')
  stage.style.cssText =
    'position:absolute;left:0;top:0;width:0;height:0;overflow:clip;z-index:-1;pointer-events:none;display:block;'
  container.prepend(stage)
  const table = (): HTMLElement | null => container.querySelector<HTMLElement>(':scope > table, [data-slot="table"]')
  const fit = (): void => {
    const t = table()
    if (!t) return
    const w = `${Math.max(0, t.offsetLeft + t.offsetWidth)}px`
    const h = `${Math.max(0, t.offsetTop + t.offsetHeight)}px`
    if (stage.style.width !== w) stage.style.width = w
    if (stage.style.height !== h) stage.style.height = h
  }
  fit()

  const setRest = (row: Element | null): void => {
    if (row === rest) return
    rest?.removeAttribute(TABLE_REST_ATTR)
    rest = row
    rest?.setAttribute(TABLE_REST_ATTR, '')
  }

  const listOpts = (o: TableHighlightOptions) => {
    const { selected: _selected, ...rest } = o
    return { feel: TABLE_FEEL, ...rest, pop: false, items: TABLE_ROWS, hover: true, focus: false }
  }
  const inner = attachListHighlight(
    container,
    {
      ...listOpts(opts),
      active: (c) => (opts.selected ? findTableSelected(c) : null),
    },
    {
      layer: stage,
      rect: (r) => tableRowRect(r),
      radius: () => TABLE_RADIUS,
    },
  )

  // Whether the selected row's flat fill shows: while the blob is (heading) there, i.e. no
  // other row is hovered, the goo is its fill. Read from the DOM marks, so it is exact the
  // moment hover changes (the engine's own target only updates on its next frame).
  const syncRest = (): void => {
    const sel = opts.selected ? findTableSelected(container) : null
    const hovered = container.querySelector(`${TABLE_ROWS}[data-highlighted]`)
    setRest(sel && (!hovered || hovered === sel) ? sel : null)
  }
  const RO = win?.ResizeObserver
  const ro = RO
    ? new RO(() => {
        fit()
        inner.refresh()
      })
    : null
  const t0 = table()
  if (t0) ro?.observe(t0)
  const MO = win?.MutationObserver
  const mo = MO
    ? new MO(() => {
        fit()
        syncRest()
      })
    : null
  mo?.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-state', 'aria-selected', 'data-highlighted'],
  })
  syncRest()

  return {
    pop: () => 0,
    refresh: () => {
      fit()
      inner.refresh()
      syncRest()
    },
    update(next = {}) {
      opts = { ...opts, ...next }
      inner.update(listOpts(next))
      inner.refresh()
      syncRest()
    },
    get target() {
      return inner.target
    },
    get reducedMotion() {
      return inner.reducedMotion
    },
    get element() {
      return inner.element
    },
    destroy() {
      ro?.disconnect()
      mo?.disconnect()
      setRest(null)
      inner.destroy()
      stage.remove()
    },
  }
}

// Sheet: a big goo panel that blooms in from a viewport edge (GoopSheet).
//
// "Bloom from the edge": the popover / dialog bloom (`./emerge`, `detached: true`) with its
// origin at the middle of the sheet's screen edge. A goo blob appears there, spreads in
// organic lobes to fill the sheet's rect, overshoots past the inner edge and wobbles (the
// open slosh), then throws the big splash (globs, drops, specks) off the inner edge and the
// sides; the drops fall and fade. Edges that lie on the screen edge are splash walls: no
// drops fly off-screen from them (they move to the opposite edge instead). Close: the close
// slosh pulls it in and it shrinks back into the edge's middle. Nothing moves once the
// splash has landed (no idle drips, no endless ticker).
//
// The host is the sheet (real, accessible DOM, at its final rect against the edge); the goo
// surface sits behind its content. Everything visual is the emerge engine: this module only
// supplies the feel table and the edge-midpoint origin.

import type { GoopPreset } from './constants'
import {
  attachEmerge,
  type EmergeEffects,
  type EmergeFeel,
  type EmergeHandle,
  type EmergePoint,
  type EmergeRect,
  type EmergeSide,
  type EmergeState,
} from './emerge'
import type { EmergeDripOptions, EmergeMomentumEffects } from './emerge-momentum'
import type { GoopRendererOption } from './renderers/resolve'

/** Viewport edge the sheet comes in from (shadcn's `side`). */
export type SheetSide = EmergeSide

/** Per-preset bloom feel for sheets (an EmergeFeel; the bloom fields drive it). A bigger,
 *  slower bloom than the dialog's. The puddle is pinned to the screen edge, so its overshoot
 *  all goes past the inner edge; the splash is bigger and flung further (`bloomSplash`). */
export const SHEET_FEEL: Readonly<Record<GoopPreset, Readonly<EmergeFeel>>> = Object.freeze({
  subtle: Object.freeze({ open: 0.5, close: 0.28, bulb: 0.38, decay: 7, travel: 0.45, snap: 0.45, softness: 6, bloomOpen: 0.58, bloomClose: 0.26, bloomOvershoot: 4, bloomSplash: Object.freeze({ amount: 1.2, size: 1.3, fling: 1.4 }) }),
  playful: Object.freeze({ open: 0.66, close: 0.32, bulb: 0.46, decay: 4.5, travel: 1, snap: 0.65, softness: 7, bloomOpen: 0.7, bloomClose: 0.3, bloomOvershoot: 7, bloomSplash: Object.freeze({ amount: 1.35, size: 1.5, fling: 1.7 }) }),
  wild: Object.freeze({ open: 0.8, close: 0.36, bulb: 0.54, decay: 3, travel: 1.6, snap: 0.9, softness: 8, bloomOpen: 0.84, bloomClose: 0.34, bloomOvershoot: 10, bloomSplash: Object.freeze({ amount: 1.5, size: 1.6, fling: 1.9 }) }),
})

/** Effect toggles: the bloom's (EmergeEffects' bloomStart / wobble / fade) and its momentum
 *  (openSlosh, openDrips + knobs, closeSlosh). */
export type SheetEffects = Pick<EmergeEffects, 'bloomStart' | 'wobble' | 'fade'> & EmergeMomentumEffects & EmergeDripOptions

export type SheetState = EmergeState

export interface SheetOptions extends SheetEffects {
  /** Edge the sheet comes in from. Default: the host's `data-side`, then 'right'. */
  side?: SheetSide | (() => SheetSide | null | undefined)
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'canvas' (default for this big surface), 'svg', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion and
   *  `<html data-reduced-motion="true">`, live. */
  reducedMotion?: boolean | 'auto'
  /** Use this element as the goo surface instead of creating one (must be a child of host). */
  surface?: HTMLElement
  /** Per-preset feel table. Default SHEET_FEEL. */
  feel?: Readonly<Record<GoopPreset, Readonly<EmergeFeel>>>
}

/** The live sheet: an emerge handle (state attr `data-goop-emerge`, content opacity
 *  `--goop-emerge-content`, close length `--goop-emerge-close`). */
export type SheetHandle = EmergeHandle

/** Where the bloom starts and shrinks back to: the middle of the sheet's screen edge, in the
 *  same space as `rect`. Pure. */
export function sheetBloomOrigin(rect: EmergeRect, side: SheetSide): EmergePoint {
  const { x, y, width: w, height: h } = rect
  switch (side) {
    case 'top':
      return { x: x + w / 2, y }
    case 'bottom':
      return { x: x + w / 2, y: y + h }
    case 'left':
      return { x, y: y + h / 2 }
    default:
      return { x: x + w, y: y + h / 2 }
  }
}

const isSide = (s: unknown): s is SheetSide => s === 'top' || s === 'right' || s === 'bottom' || s === 'left'

/**
 * Attach a goo sheet to `host` (the sheet panel, at its final rect against the viewport
 * edge). Starts closed: call `open()`. The host becomes a stacking context; its own
 * background should be clear (the goo, colored by `--goop-color`, is the background).
 */
export function attachSheet(host: HTMLElement, options: SheetOptions = {}): SheetHandle {
  let opts: SheetOptions = { ...options }
  const side = (): SheetSide => {
    const s = typeof opts.side === 'function' ? opts.side() : opts.side
    if (isSide(s)) return s
    const attr = host.getAttribute('data-side')
    return isSide(attr) ? attr : 'right'
  }
  const origin = (): EmergePoint => {
    const r = host.getBoundingClientRect()
    return sheetBloomOrigin({ x: r.left, y: r.top, width: r.width || host.offsetWidth, height: r.height || host.offsetHeight }, side())
  }
  const map = (o: SheetOptions) => {
    const { side: _side, feel, renderer, ...rest } = o
    return {
      ...rest,
      feel: feel ?? SHEET_FEEL,
      renderer: renderer ?? 'canvas',
      detached: true,
      surfaceColor: 'popover' as const,
      bloomOrigin: origin,
    }
  }
  const handle = attachEmerge(host, map(opts))
  return {
    open: () => handle.open(),
    close: () => handle.close(),
    update(next: SheetOptions = {}) {
      opts = { ...opts, ...next }
      handle.update(map(opts))
    },
    refresh: () => handle.refresh(),
    get state() {
      return handle.state
    },
    get reducedMotion() {
      return handle.reducedMotion
    },
    get closeDuration() {
      return handle.closeDuration
    },
    get colors() {
      return handle.colors
    },
    destroy: () => handle.destroy(),
  }
}

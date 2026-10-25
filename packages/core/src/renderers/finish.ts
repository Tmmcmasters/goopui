// Surface finish ("solid" or "oil" thin-film iridescence). Names mirror the engine-side
// plumbing (`finish` option + `--goop-finish` / `--goop-oil-*` vars) so the two merge
// trivially. A renderer that can draw finishes implements the optional `setFinish`.

import type { GoopRenderer } from '../renderer'

export type GoopFinishName = 'solid' | 'oil'

export interface GoopFinish {
  finish: GoopFinishName
  /** `--goop-oil-intensity` 0..1: how strongly the film colors and the specular show. */
  oilIntensity: number
  /** `--goop-oil-scale`: band size multiplier (1 = default, 2 = bands twice as large). */
  oilScale: number
  /** `--goop-oil-shift`: film thickness offset in cycles (0..1 rotates the band palette). */
  oilShift: number
  /** `--goop-oil-react` 0..2: how much the film bands follow the pointer (drift, swirl,
   *  stretch, light). Default 0: the film only drifts slowly on its own and rides the goo's
   *  own motion; the goo itself stays fully pointer-reactive. */
  oilReact: number
}

export const GOOP_FINISH_DEFAULTS: Readonly<GoopFinish> = Object.freeze({
  finish: 'solid',
  oilIntensity: 0.6,
  oilScale: 1,
  oilShift: 0,
  oilReact: 0,
})

export const GOOP_FINISH_VARS = Object.freeze({
  finish: '--goop-finish',
  oilIntensity: '--goop-oil-intensity',
  oilScale: '--goop-oil-scale',
  oilShift: '--goop-oil-shift',
  oilReact: '--goop-oil-react',
})

/** A renderer that can draw finishes. */
export interface GoopFinishRenderer extends GoopRenderer {
  /** JS overrides (undefined fields fall back to the host's CSS vars, then defaults). */
  setFinish?(overrides: Partial<GoopFinish>): void
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Resolve the finish for `el`: defaults < `--goop-*` CSS vars < JS overrides. */
export function readFinish(el: Element, overrides: Partial<GoopFinish> = {}): GoopFinish {
  const cs = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
  const num = (key: Exclude<keyof GoopFinish, 'finish'>): number => {
    const o = overrides[key]
    if (typeof o === 'number' && Number.isFinite(o)) return o
    const n = Number.parseFloat(cs?.getPropertyValue(GOOP_FINISH_VARS[key])?.trim() ?? '')
    return Number.isFinite(n) ? n : GOOP_FINISH_DEFAULTS[key]
  }
  const rawFinish = overrides.finish ?? cs?.getPropertyValue(GOOP_FINISH_VARS.finish)?.trim().replace(/['"]/g, '')
  return {
    finish: rawFinish === 'oil' ? 'oil' : 'solid',
    oilIntensity: clamp(num('oilIntensity'), 0, 1),
    oilScale: clamp(num('oilScale'), 0.1, 10),
    oilShift: num('oilShift'),
    oilReact: clamp(num('oilReact'), 0, 2),
  }
}

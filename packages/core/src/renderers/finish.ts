// Surface finish ("solid" or "oil" thin-film iridescence). Names, defaults, ranges and
// descriptions come from GOOP_VAR_META (constants.ts). A renderer that can draw finishes
// implements the optional `setFinish`.

import { GOOP_VAR_META } from '../constants'
import type { GoopRenderer } from '../renderer'
import { readVar, renameOptions } from '../tuning'

export type GoopFinishName = 'solid' | 'oil'

export interface GoopFinish {
  finish: GoopFinishName
  /** `--goop-oil-intensity` 0..1: how strongly the film colors and the specular show. */
  oilIntensity: number
  /** `--goop-oil-band-size`: band size multiplier (1 = default, 2 = bands twice as large). */
  oilBandSize: number
  /** `--goop-oil-hue-shift`: film thickness offset in cycles (0..1 rotates the band palette). */
  oilHueShift: number
  /** `--goop-oil-follow-pointer` 0..2: how much the bands follow the pointer. Default 0. */
  oilFollowPointer: number
}

type NumKey = Exclude<keyof GoopFinish, 'finish'>
const NUM_KEYS: NumKey[] = ['oilIntensity', 'oilBandSize', 'oilHueShift', 'oilFollowPointer']

export const GOOP_FINISH_DEFAULTS: Readonly<GoopFinish> = Object.freeze({
  finish: 'solid',
  ...Object.fromEntries(NUM_KEYS.map((k) => [k, GOOP_VAR_META[k]!.default as number])),
} as GoopFinish)

export const GOOP_FINISH_VARS: Readonly<Record<keyof GoopFinish, string>> = Object.freeze({
  finish: GOOP_VAR_META.finish!.name,
  ...Object.fromEntries(NUM_KEYS.map((k) => [k, GOOP_VAR_META[k]!.name])),
} as Record<keyof GoopFinish, string>)

/** A renderer that can draw finishes. */
export interface GoopFinishRenderer extends GoopRenderer {
  /** JS overrides (undefined fields fall back to the host's CSS vars, then defaults). */
  setFinish?(overrides: Partial<GoopFinish>): void
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Resolve the finish for `el`: defaults < `--goop-*` CSS vars (old names as fallback) < JS
 *  overrides (old option names like `oilScale` are mapped too). */
export function readFinish(el: Element, overrides: Partial<GoopFinish> = {}): GoopFinish {
  const cs = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
  const ov = renameOptions(overrides as Record<string, unknown>) as Partial<GoopFinish>
  const num = (key: NumKey): number => {
    const o = ov[key]
    const m = GOOP_VAR_META[key]!
    let v = GOOP_FINISH_DEFAULTS[key]
    if (typeof o === 'number' && Number.isFinite(o)) v = o
    else {
      const n = Number.parseFloat(readVar(cs, m.name, m.aliases))
      if (Number.isFinite(n)) v = n
    }
    return clamp(v, m.min ?? -Infinity, m.max ?? Infinity)
  }
  const rawFinish = ov.finish ?? readVar(cs, GOOP_FINISH_VARS.finish).replace(/['"]/g, '')
  return {
    finish: rawFinish === 'oil' ? 'oil' : 'solid',
    oilIntensity: num('oilIntensity'),
    oilBandSize: num('oilBandSize'),
    oilHueShift: num('oilHueShift'),
    oilFollowPointer: num('oilFollowPointer'),
  }
}

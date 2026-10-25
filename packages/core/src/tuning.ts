import {
  GOOP_CSS_VARS,
  GOOP_DEFAULT_PRESET,
  GOOP_DEFAULTS,
  GOOP_LIMITS,
  GOOP_PRESETS,
  GOOP_PRESET_VAR,
  type GoopPreset,
  type GoopTuning,
} from './constants'

const KEYS = Object.keys(GOOP_DEFAULTS) as (keyof GoopTuning)[]

const isPreset = (v: unknown): v is GoopPreset => v === 'subtle' || v === 'playful' || v === 'wild'

/** Resolve the preset for `el`: explicit option > `--goop-preset` > 'playful'. */
export function readPreset(el: Element, option?: GoopPreset): GoopPreset {
  if (isPreset(option)) return option
  const raw = el.ownerDocument?.defaultView
    ?.getComputedStyle?.(el)
    ?.getPropertyValue(GOOP_PRESET_VAR)
    ?.trim()
    .replace(/['"]/g, '')
  return isPreset(raw) ? raw : GOOP_DEFAULT_PRESET
}

/**
 * Resolve tuning for `el`. Precedence (highest first): explicit `overrides` (JS options) >
 * numeric `--goop-*` custom properties on (or inherited by) `el` > the preset's values >
 * GOOP_DEFAULTS. Values are clamped to GOOP_LIMITS. "6" and "6px" both read as 6.
 */
export function readTuning(el: Element, overrides: Partial<GoopTuning> = {}, preset?: GoopPreset): GoopTuning {
  const cs = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
  const base: GoopTuning = { ...GOOP_DEFAULTS, ...(preset ? GOOP_PRESETS[preset].tuning : {}) }
  const out = { ...base }
  for (const key of KEYS) {
    let v: number = base[key]
    const raw = cs?.getPropertyValue(GOOP_CSS_VARS[key])?.trim()
    if (raw) {
      const n = Number.parseFloat(raw)
      if (Number.isFinite(n)) v = n
    }
    const o = overrides[key]
    if (typeof o === 'number' && Number.isFinite(o)) v = o
    const [lo, hi] = GOOP_LIMITS[key]
    out[key] = Math.min(hi, Math.max(lo, v))
  }
  out.dripCount = Math.round(out.dripCount)
  out.restingDrips = Math.round(out.restingDrips)
  out.maxDrips = Math.round(out.maxDrips)
  return out
}

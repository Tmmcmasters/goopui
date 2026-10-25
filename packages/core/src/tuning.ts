import { GOOP_CSS_VARS, GOOP_DEFAULTS, GOOP_LIMITS, type GoopTuning } from './constants'

const KEYS = Object.keys(GOOP_DEFAULTS) as (keyof GoopTuning)[]

/**
 * Resolve tuning for `el`: defaults, overridden by numeric `--goop-*` custom properties
 * found on (or inherited by) `el`, overridden by explicit `overrides`. Values are clamped
 * to GOOP_LIMITS. Unitless or px values are accepted ("6" and "6px" both read as 6).
 */
export function readTuning(el: Element, overrides: Partial<GoopTuning> = {}): GoopTuning {
  const cs = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
  const out = { ...GOOP_DEFAULTS }
  for (const key of KEYS) {
    let v: number = GOOP_DEFAULTS[key]
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
  return out
}

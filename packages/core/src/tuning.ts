import {
  GOOP_CSS_VARS,
  GOOP_DEFAULT_PRESET,
  GOOP_DEFAULTS,
  GOOP_LIMITS,
  GOOP_OPTION_RENAMES,
  GOOP_PRESETS,
  GOOP_PRESET_VAR,
  GOOP_VAR_META,
  type GoopPreset,
  type GoopTuning,
} from './constants'
import type { GooFilterParams } from './filter'

const KEYS = Object.keys(GOOP_DEFAULTS) as (keyof GoopTuning)[]

const isPreset = (v: unknown): v is GoopPreset => v === 'subtle' || v === 'playful' || v === 'wild'

/** The goo filter parameters a tuning implies. */
export function gooParamsOf(t: GoopTuning): GooFilterParams {
  return { blur: t.softness, contrast: t.edgeSharpness, threshold: t.edge, gloss: t.gloss }
}

// ---- deprecated names ------------------------------------------------------------------

const warned = new Set<string>()
/** One-time dev warning for a deprecated var / option name. */
export function warnDeprecated(oldName: string, newName: string): void {
  if (warned.has(oldName)) return
  warned.add(oldName)
  if (typeof console !== 'undefined') {
    console.warn(`[goopui] "${oldName}" is deprecated; use "${newName}". The old name still works for now.`)
  }
}

/** Read a var by its current name, falling back to deprecated aliases (with a warning). */
export function readVar(cs: CSSStyleDeclaration | null | undefined, name: string, aliases?: readonly string[]): string {
  const v = cs?.getPropertyValue(name)?.trim()
  if (v) return v
  for (const a of aliases ?? []) {
    const old = cs?.getPropertyValue(a)?.trim()
    if (old) {
      warnDeprecated(a, name)
      return old
    }
  }
  return ''
}

/** Map deprecated JS option keys (e.g. `viscosity`) onto their new names (e.g. `thickness`). */
export function renameOptions<T extends object>(o: T): T {
  let out: Record<string, unknown> | null = null
  for (const [oldKey, newKey] of Object.entries(GOOP_OPTION_RENAMES)) {
    if (!(oldKey in o) || (o as Record<string, unknown>)[oldKey] === undefined) continue
    out ??= { ...(o as Record<string, unknown>) }
    warnDeprecated(oldKey, newKey)
    if (out[newKey] === undefined) out[newKey] = out[oldKey]
    delete out[oldKey]
  }
  return (out ?? o) as T
}

// ---- resolution --------------------------------------------------------------------------

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
 * numeric `--goop-*` custom properties on (or inherited by) `el` (deprecated names are read
 * as a fallback) > the preset's values > GOOP_DEFAULTS. Values are clamped to GOOP_LIMITS.
 * "6" and "6px" both read as 6.
 */
export function readTuning(el: Element, overrides: Partial<GoopTuning> = {}, preset?: GoopPreset): GoopTuning {
  const cs = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
  const base: GoopTuning = { ...GOOP_DEFAULTS, ...(preset ? GOOP_PRESETS[preset].tuning : {}) }
  const ov = renameOptions(overrides as Record<string, unknown>) as Partial<GoopTuning>
  const out = { ...base }
  for (const key of KEYS) {
    let v: number = base[key]
    const raw = readVar(cs, GOOP_CSS_VARS[key], GOOP_VAR_META[key]?.aliases)
    if (raw) {
      const n = Number.parseFloat(raw)
      if (Number.isFinite(n)) v = n
    }
    const o = ov[key]
    if (typeof o === 'number' && Number.isFinite(o)) v = o
    const [lo, hi] = GOOP_LIMITS[key]
    out[key] = Math.min(hi, Math.max(lo, v))
  }
  out.dripCount = Math.round(out.dripCount)
  out.restingDrips = Math.round(out.restingDrips)
  out.maxDrips = Math.round(out.maxDrips)
  return out
}

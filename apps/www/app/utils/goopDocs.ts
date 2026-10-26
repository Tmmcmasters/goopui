// Thin helpers over the engine's own metadata. Every name, label, description, unit,
// default, range, group, cost and reduced-motion note comes from GOOP_VAR_META in
// @goopui/core; nothing here restates them. New vars show up in the docs table and the
// tuner automatically, in their group.
import { GOOP_PRESETS, GOOP_VAR_META, type GoopPreset, type GoopVarMeta } from '@goopui/core'

export type VarMeta = GoopVarMeta

/** Every var, in the engine's order. */
export const ALL_VARS: VarMeta[] = Object.values(GOOP_VAR_META)

/** Groups in first-seen order, each with its vars. */
export function varGroups(filter?: (m: VarMeta) => boolean): { group: string; vars: VarMeta[] }[] {
  const out: { group: string; vars: VarMeta[] }[] = []
  for (const m of ALL_VARS) {
    if (filter && !filter(m)) continue
    let g = out.find((x) => x.group === m.group)
    if (!g) out.push((g = { group: m.group, vars: [] }))
    g.vars.push(m)
  }
  return out
}

export const isKeyword = (m: VarMeta) => m.unit === 'keyword'
export const isNumeric = (m: VarMeta) => !isKeyword(m) && typeof m.default === 'number'

export function meta(option: string): VarMeta {
  const m = GOOP_VAR_META[option]
  if (!m) throw new Error(`[www] unknown goop var option: ${option}`)
  return m
}

/** Default for a var under a preset (presets only override some numeric knobs). */
export function presetDefault(m: VarMeta, preset: GoopPreset): number | string {
  const p = GOOP_PRESETS[preset]
  if (m.option === 'splash') return p.splash
  if (m.option === 'hitEffect') return p.hitEffect ?? m.default
  const v = (p.tuning as Record<string, number | undefined>)[m.option]
  return v ?? m.default
}

/** Readable unit suffix for a value ('px', 's', 'x'); empty for ranges like '0-1'. */
export function unitSuffix(m: VarMeta): string {
  return ['px', 's', 'x'].includes(m.unit) ? (m.unit === 'x' ? '×' : m.unit) : ''
}

export function rangeText(m: VarMeta): string {
  if (m.values) return m.values.join(' · ')
  if (m.min === undefined || m.max === undefined) return ''
  return `${m.min} to ${m.max}`
}

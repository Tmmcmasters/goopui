// Pure helpers behind the docs playground: control defaults, the props each demo part gets,
// the Code tab's snippet, and the props table rows. No Vue here.
import { controlId, type ComponentDoc, type Control, type ControlValues, type PropRow } from './types'

/** Which docs: Vue (/docs) or React (/react/docs). */
export type DocsFramework = 'vue' | 'react'

export const partOf = (c: Control): string => c.part ?? 'main'

/** The value a control shows when the reader hasn't touched it. */
export function defaultOf(c: Control, values: ControlValues): unknown {
  if (c.kind === 'color') return ''
  return typeof c.default === 'function' ? c.default(values) : c.default
}

/** The value a control shows now. */
export const valueOf = (c: Control, values: ControlValues): unknown => (controlId(c) in values ? values[controlId(c)] : defaultOf(c, values))

/** Words from a camelCase prop: `openSlosh` -> 'Open slosh'. */
export const words = (prop: string): string => {
  const s = prop.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const labelOf = (c: Control): string => c.label ?? words(c.prop)

const kebab = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

/** Changed props per part, ready for `v-bind` (colours become a `style` object). */
export function partProps(doc: ComponentDoc, values: ControlValues): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  for (const c of doc.controls) {
    const id = controlId(c)
    if (!(id in values)) continue
    const p = (out[partOf(c)] ??= {})
    if (c.kind === 'color') p.style = { ...(p.style as object | undefined), [c.cssVar]: values[id] }
    else p[c.prop] = values[id]
  }
  return out
}

/** JSX attributes for one part's changed props (React). */
function jsxAttrs(doc: ComponentDoc, values: ControlValues, part: string): string[] {
  const out: string[] = []
  const styles: string[] = []
  for (const c of doc.controls) {
    const id = controlId(c)
    if (partOf(c) !== part || !(id in values)) continue
    const v = values[id]
    if (c.kind === 'color') styles.push(`'${c.cssVar}': '${v}'`)
    else if (v === true) out.push(c.prop)
    else if (typeof v === 'boolean' || typeof v === 'number') out.push(`${c.prop}={${v}}`)
    else out.push(`${c.prop}="${v}"`)
  }
  if (styles.length) out.push(`style={{ ${styles.join(', ')} }}`)
  return out
}

/** Template attributes for one part's changed props. */
function attrs(doc: ComponentDoc, values: ControlValues, part: string): string[] {
  const out: string[] = []
  const styles: string[] = []
  for (const c of doc.controls) {
    const id = controlId(c)
    if (partOf(c) !== part || !(id in values)) continue
    const v = values[id]
    const name = kebab(c.prop)
    if (c.kind === 'color') styles.push(`${c.cssVar}: ${v}`)
    else if (v === true) out.push(name)
    else if (typeof v === 'boolean' || typeof v === 'number') out.push(`:${name}="${v}"`)
    else out.push(`${name}="${v}"`)
  }
  if (styles.length) out.push(`style="${styles.join('; ')}"`)
  return out
}

/**
 * The Code tab snippet: each `{{part}}` in `doc.code` becomes that part's attributes, inline
 * when the line stays short, otherwise one per line under the tag.
 */
export function codeFor(doc: ComponentDoc, values: ControlValues, fw: DocsFramework = 'vue'): string {
  const react = fw === 'react' && !!doc.reactCode
  const list = react ? jsxAttrs : attrs
  return (react ? doc.reactCode! : doc.code)
    .split('\n')
    .map((line) => {
      const m = /^(.*?)\{\{(\w+)\}\}(.*)$/.exec(line)
      if (!m) return line
      const [, before = '', part = 'main', rest = ''] = m
      const items = list(doc, values, part)
      if (!items.length) return before + rest
      const inline = ` ${items.join(' ')}`
      if (before.length + inline.length + rest.length <= 76) return before + inline + rest
      // One attribute per line, including the ones already written before the token.
      const indent = /^\s*/.exec(line)![0]
      const tag = /^\s*<[\w.-]+/.exec(before)?.[0] ?? before
      const existing = before.slice(tag.length).match(/[^\s=]+(?:=(?:"[^"]*"|\{\{[^}]*\}\}|\{[^}]*\}))?/g) ?? []
      return `${tag}\n${[...existing, ...items].map((a) => `${indent}  ${a}`).join('\n')}\n${indent}${rest.trimStart()}`
    })
    .join('\n')
}

/** Rows for a props table: the entry's own rows, then any control prop they don't cover. */
export function tableRows(doc: ComponentDoc, part?: string, fw: DocsFramework = 'vue'): { caption: string; rows: PropRow[] } {
  const tables = (fw === 'react' ? doc.reactTables : undefined) ?? doc.tables ?? {}
  const key = part ?? Object.keys(tables)[0] ?? 'main'
  const table = tables[key] ?? { caption: `${doc.component} props`, rows: [] }
  const listed = new Set(table.rows.flatMap((r) => r.prop.split(/,\s*/)))
  const extra: PropRow[] = []
  for (const c of doc.controlsInTable === false ? [] : doc.controls) {
    if (c.kind === 'color' || partOf(c) !== key || listed.has(c.prop)) continue
    extra.push({ prop: c.prop, type: c.type ?? (c.kind === 'slider' ? 'number' : c.kind === 'switch' ? 'boolean' : 'string'), def: fmt(defaultOf(c, {})), note: c.description ?? '' })
  }
  return { caption: table.caption, rows: [...table.rows, ...extra] }
}

const fmt = (v: unknown): string => (typeof v === 'string' ? `'${v}'` : String(v))

/** A control's description: its own, else the note of the matching props-table row. */
export function descriptionOf(doc: ComponentDoc, c: Control): string {
  if (c.description) return c.description
  for (const t of Object.values(doc.tables ?? {})) {
    const row = t.rows.find((r) => r.prop.split(/,\s*/).includes(c.prop))
    if (row) return row.note
  }
  return ''
}

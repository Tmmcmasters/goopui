// Every component docs entry (./entries/*.ts, picked up automatically), plus the component
// count and sidebar categories. See ./README.md for adding a component.
import { goopComponents as reactComponents } from '@goopui/react/manifest'
import { goopComponents } from '@goopui/vue'
import type { Category, ComponentDoc } from './types'

const modules = import.meta.glob<{ default: ComponentDoc }>('./entries/*.ts', { eager: true })

export const componentDocs: ComponentDoc[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.title.localeCompare(b.title))

const bySlug = new Map(componentDocs.map((d) => [d.slug, d]))

export const componentDoc = (slug: string): ComponentDoc | undefined => bySlug.get(slug)

if (import.meta.dev) {
  const known = new Set<string>(goopComponents)
  for (const d of componentDocs) if (!known.has(d.component)) console.warn(`[www] ${d.slug}: ${d.component} is not in @goopui/vue's manifest`)
}

const REACT = new Set<string>(reactComponents)

/** Whether a component docs page (by slug) has a React version in @goopui/react yet. Pages
 *  with no component (the docs' other sections) count as having one. */
export const hasReactVersion = (slug: string): boolean => {
  const d = bySlug.get(slug)
  return !d || REACT.has(d.component)
}

/** Categories for docs pages that have no entry yet (so a new page still lands in a group). */
const FALLBACK: Record<string, Category> = {
  badge: 'Feedback',
  skeleton: 'Feedback',
  avatar: 'Layout',
  card: 'Layout',
  separator: 'Layout',
  sidebar: 'Navigation',
  command: 'Navigation',
  'context-menu': 'Overlays',
  'hover-card': 'Overlays',
  combobox: 'Forms',
  'number-field': 'Forms',
  'input-otp': 'Forms',
  label: 'Forms',
  blob: 'Layout',
}

/** The sidebar / index category of a component docs page, by slug. */
export const categoryOf = (slug: string): Category => bySlug.get(slug)?.category ?? FALLBACK[slug] ?? 'Other'

// ---- component count, from the manifest ----------------------------------------------------

/**
 * Roots whose name happens to start with another root's name (ToggleGroup starts with
 * Toggle). Add a new component here if its name extends an existing one.
 */
const STANDALONE = new Set(['GoopToggleGroup', 'GoopInputOTP', 'GoopInputOtp', 'GoopAlertDialog', 'GoopButtonGroup', 'GoopInputGroup'])

/**
 * Top-level components in @goopui/vue's manifest. A part (GoopDialogContent, GoopSelectItem)
 * is a name that extends another export's name at a word boundary.
 */
export const rootComponents: string[] = goopComponents.filter(
  (name) =>
    STANDALONE.has(name) ||
    !goopComponents.some((other) => other !== name && name.startsWith(other) && /[A-Z]/.test(name[other.length] ?? '')),
)

export const componentCount = rootComponents.length

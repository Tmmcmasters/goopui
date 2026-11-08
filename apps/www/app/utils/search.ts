// Docs search: ranking for the ⌘K palette (components/search/Palette.vue). Pure functions over
// the sections Nuxt Content's `queryCollectionSearchSections('docs')` returns: one entry per
// page (id = its path) and one per heading (id = `path#hash`, `titles` = the headings above it).

export interface SearchSection {
  id: string
  title: string
  titles: string[]
  level: number
  content: string
}

export interface SearchHit {
  section: SearchSection
  score: number
  /** "Slider › Props". */
  crumbs: string[]
  /** A short excerpt around the match when only the body text matched. */
  snippet?: string
}

/** The top-level docs sections, in sidebar order. */
export const SEARCH_GROUPS = [
  { prefix: '/docs/getting-started', label: 'Getting started' },
  { prefix: '/docs/components', label: 'Components' },
  { prefix: '/docs/core', label: 'Core' },
] as const

export type SearchGroupLabel = (typeof SEARCH_GROUPS)[number]['label']

export function groupOf(id: string): SearchGroupLabel | null {
  for (const g of SEARCH_GROUPS) if (id === g.prefix || id.startsWith(`${g.prefix}/`)) return g.label
  return null
}

/** Lowercase, accents stripped, whitespace collapsed. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** `needle`'s characters appear in order in `hay` (fuzzy), each gap short-ish. */
function subsequence(hay: string, needle: string): boolean {
  let i = 0
  let gap = 0
  for (const ch of hay) {
    if (ch === needle[i]) {
      i++
      gap = 0
      if (i === needle.length) return true
    } else if (i > 0 && ++gap > 3) {
      // Too spread out to be a typo of this word: restart.
      i = ch === needle[0] ? 1 : 0
      gap = 0
    }
  }
  return false
}

const wordStart = (hay: string, needle: string) => hay.startsWith(needle) || hay.includes(` ${needle}`) || hay.includes(`-${needle}`)

function snippetAround(text: string, needle: string): string | undefined {
  const at = normalize(text).indexOf(needle)
  if (at < 0) return undefined
  // normalize() collapses whitespace, so map back roughly by collapsing the source too.
  const flat = text.replace(/\s+/g, ' ').trim()
  const start = Math.max(0, at - 30)
  const end = Math.min(flat.length, at + needle.length + 70)
  let out = flat.slice(start, end)
  // Start on a whole word.
  const space = out.indexOf(' ')
  if (start > 0 && space >= 0 && space < at - start) out = out.slice(space + 1)
  return `${start > 0 ? '…' : ''}${out.trim()}${end < flat.length ? '…' : ''}`
}

/** Score one section against a normalized query. 0 = no match. Title matches rank first,
 *  then matches in the parent headings ("slider props"), then body text. */
export function scoreSection(section: SearchSection, q: string): SearchHit | null {
  const title = normalize(section.title)
  const parents = normalize(section.titles.join(' '))
  const body = normalize(section.content)
  const crumbs = [...section.titles, section.title]
  let score = 0

  // Whole-query matches on the title.
  if (title === q) score += 1000
  else if (title.startsWith(q)) score += 800
  else if (wordStart(title, q)) score += 650
  else if (title.includes(q)) score += 550

  // Every word must match somewhere.
  let bodyOnly = true
  for (const t of q.split(' ')) {
    if (title.includes(t)) {
      score += wordStart(title, t) ? 120 : 90
      bodyOnly = false
    } else if (parents.includes(t)) {
      score += wordStart(parents, t) ? 70 : 50
      bodyOnly = false
    } else if (t.length >= 3 && subsequence(title, t)) {
      score += 35
      bodyOnly = false
    } else if (body.includes(t)) {
      score += 8
    } else {
      return null
    }
  }
  // Pages above their own sections; shallow headings above deep ones.
  if (section.titles.length === 0) score += 6
  score -= section.level
  const hit: SearchHit = { section, score, crumbs }
  if (bodyOnly) hit.snippet = snippetAround(section.content, q.split(' ')[0]!)
  return hit
}

export interface SearchResultGroup {
  label: SearchGroupLabel
  hits: SearchHit[]
}

/** Ranked hits grouped by top-level docs section. Groups are ordered by their best hit. With
 *  no query, every page (no headings) in sidebar order. */
export function searchDocs(sections: SearchSection[], query: string, perGroup = 8): SearchResultGroup[] {
  const q = normalize(query)
  const buckets = new Map<SearchGroupLabel, SearchHit[]>()
  for (const s of sections) {
    const label = groupOf(s.id)
    if (!label) continue
    let hit: SearchHit | null
    if (!q) hit = s.titles.length === 0 ? { section: s, score: 0, crumbs: [s.title] } : null
    else hit = scoreSection(s, q)
    if (!hit) continue
    const list = buckets.get(label) ?? []
    list.push(hit)
    buckets.set(label, list)
  }
  const groups: SearchResultGroup[] = []
  for (const g of SEARCH_GROUPS) {
    const hits = buckets.get(g.label)
    if (!hits?.length) continue
    // Stable sort keeps sidebar order among equal scores (and for the empty query).
    if (q) hits.sort((a, b) => b.score - a.score)
    groups.push({ label: g.label, hits: q ? hits.slice(0, perGroup) : hits })
  }
  if (q) groups.sort((a, b) => b.hits[0]!.score - a.hits[0]!.score)
  return groups
}

/** Match a palette action against the query by its label and keywords. */
export function scoreAction(label: string, keywords: string, query: string): number {
  const q = normalize(query)
  if (!q) return 1
  const l = normalize(label)
  const k = normalize(keywords)
  let score = l.startsWith(q) ? 500 : wordStart(l, q) ? 400 : 0
  for (const t of q.split(' ')) {
    if (l.includes(t)) score += 100
    else if (k.includes(t)) score += 60
    else if (t.length >= 3 && subsequence(l, t)) score += 30
    else return 0
  }
  return score
}

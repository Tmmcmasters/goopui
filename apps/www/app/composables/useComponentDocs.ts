// Which component docs pages exist, so the landing links only to real pages (components
// whose docs haven't landed yet render as plain text instead of a 404 link).
export function useComponentDocs() {
  const { data: nav } = useDocsNav()
  const paths = computed(() => {
    const out = new Set<string>()
    const walk = (items: { path: string; children?: unknown[] }[] | undefined) => {
      for (const i of items ?? []) {
        out.add(i.path)
        walk(i.children as { path: string; children?: unknown[] }[] | undefined)
      }
    }
    walk(nav.value)
    return out
  })
  /** The docs path for a component slug, or null when that page doesn't exist yet. */
  const docPath = (slug: string): string | null => {
    const p = `/docs/components/${slug}`
    return paths.value.has(p) ? p : null
  }
  return { docPath }
}

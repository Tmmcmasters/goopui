import type { ContentNavigationItem } from '@nuxt/content'

/** Docs navigation tree (sections → pages), shared across layout + pages via one key. */
export function useDocsNav() {
  return useAsyncData('docs-nav', () => queryCollectionNavigation('docs', ['status', 'badge']), {
    transform: (tree: ContentNavigationItem[]) => {
      // The collection lives under /docs; show its sections at the top level.
      const root = tree.find((n) => n.path === '/docs')
      return root?.children ?? tree
    },
  })
}

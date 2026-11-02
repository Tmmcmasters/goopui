import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      // exFAT/macOS writes ._* AppleDouble files next to everything; never parse them.
      source: { include: 'docs/**/*.md', exclude: ['**/._*'] },
      schema: z.object({
        /** Shown as a pill in the sidebar and page header. */
        status: z.enum(['soon', 'preview']).optional(),
        /** `experimental`: a "New · experimental" badge in the page header and the sidebar. */
        badge: z.enum(['experimental']).optional(),
      }),
    }),
  },
})

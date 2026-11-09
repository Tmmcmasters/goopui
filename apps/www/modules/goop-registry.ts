// The shadcn registries (`npx shadcn add https://goop.timmcmasters.work/r/react/button.json`,
// `npx shadcn-vue add .../r/vue/button.json`), regenerated from the adapters' source every time
// Nuxt starts (dev, build, generate), into public/r/ (gitignored). So a deploy always serves
// items that match the packages it was built with. See scripts/build-registry.mjs.
//
// Also exposes which items exist, as `#build/goop-registry.mjs`, for the docs' "shadcn CLI"
// install block (components/content/ShadcnInstall.vue).
import { join } from 'node:path'
import { addTemplate, addTypeTemplate, defineNuxtModule, useLogger } from 'nuxt/kit'
import { buildRegistry } from '../../../scripts/build-registry.mjs'

export default defineNuxtModule({
  meta: { name: 'goop-registry' },
  setup(_options, nuxt) {
    const logger = useLogger('goop-registry')
    const { errors, summary, catalog } = buildRegistry({ out: join(nuxt.options.rootDir, 'public/r') })
    if (errors.length) {
      for (const e of errors) logger.error(e)
      throw new Error(`goop-registry: ${errors.length} problem(s) building the shadcn registry (see above)`)
    }
    if (!nuxt.options._prepare) logger.info(`shadcn registry: ${Object.entries(summary).map(([fw, n]) => `${fw} ${n} items`).join(', ')} in public/r`)

    addTemplate({
      filename: 'goop-registry.mjs',
      getContents: () => `export const registryItems = ${JSON.stringify(catalog)}\n`,
    })
    addTypeTemplate({
      filename: 'types/goop-registry.d.ts',
      getContents: () =>
        `declare module '#build/goop-registry.mjs' {\n  /** Per framework, each registry item's value exports. */\n  export const registryItems: Record<'react' | 'vue', Record<string, string[]>>\n}\n`,
    })
  },
})

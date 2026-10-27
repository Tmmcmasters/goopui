import type { GoopFinishName, GoopPreset, GoopRendererName, GoopSplashMode } from '@goopui/core'
import { addComponent, addPluginTemplate, addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { componentBaseName, goopComponents } from '@goopui/vue/manifest'
import type { NuxtModule } from '@nuxt/schema'
import { dirname } from 'node:path'

/** App-wide engine defaults. Serializable subset of GoopOptions (no renderer factories). */
export interface GoopModuleDefaults {
  /** 'subtle' | 'playful' (core default) | 'wild'. */
  preset?: GoopPreset
  /** 'svg' (core default) or 'canvas'. */
  renderer?: GoopRendererName
  /** 'solid' (core default) or 'oil'. */
  finish?: GoopFinishName
  /** 'near' (core default), 'escape' or 'off'. */
  splash?: GoopSplashMode
  /** Force reduced motion on (`true`) or ignore the OS setting (`false`). Default 'auto'. */
  reducedMotion?: boolean | 'auto'
}

export interface ModuleOptions extends GoopModuleDefaults {
  /**
   * Prefix for auto-imported components. `@goopui/vue` exports `GoopButton`; the module
   * registers `${prefix}Button`. Default 'Goop' (so `<GoopButton>`); `'X'` gives `<XButton>`,
   * `''` gives `<Button>`.
   */
  prefix: string
  /** Add `@goopui/vue/goop.css` to `nuxt.options.css`. Default true. */
  css: boolean
  /**
   * Add an `@source` for @goopui/vue to every Tailwind v4 entry CSS (files that
   * `@import "tailwindcss"`), so Tailwind generates the classes our components use. Needed
   * because a CSS file added through `nuxt.options.css` is its own Tailwind root and its
   * `@source` doesn't reach yours. Default true; turn it off if you `@import
   * "@goopui/vue/goop.css"` from your Tailwind entry yourself.
   */
  tailwindSource: boolean
}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@goopui/nuxt',
    configKey: 'goop',
    compatibility: { nuxt: '>=3.13.0' },
  },
  defaults: {
    prefix: 'Goop',
    css: true,
    tailwindSource: true,
  },
  async setup(options, nuxt) {
    const { resolvePath } = createResolver(import.meta.url)

    // .vue SFCs ship untranspiled: let Nuxt compile them (and keep them out of SSR externals
    // and Vite's esbuild dep optimizer, which can't read .vue).
    nuxt.options.build.transpile.push('@goopui/vue')
    nuxt.options.vite.optimizeDeps ||= {}
    // Core is dependency-free ESM, so it's served as-is too: one shared instance, and a rebuilt
    // core shows up on reload (pre-bundled deps are cached by the browser as immutable).
    nuxt.options.vite.optimizeDeps.exclude = [...(nuxt.options.vite.optimizeDeps.exclude ?? []), '@goopui/vue', '@goopui/core']
    // ...but do pre-bundle its plain-JS deps, or Vite discovers them at runtime and reloads.
    nuxt.options.vite.optimizeDeps.include = [
      ...(nuxt.options.vite.optimizeDeps.include ?? []),
      ...['reka-ui', 'cn', 'class-variance-authority'].map((dep) => `@goopui/vue > ${dep}`),
    ]

    for (const name of goopComponents) {
      addComponent({
        name: `${options.prefix}${componentBaseName(name)}`,
        export: name,
        filePath: '@goopui/vue',
      })
    }

    if (options.css) nuxt.options.css.push('@goopui/vue/goop.css')

    if (options.tailwindSource) {
      const vueDist = dirname(await resolvePath('@goopui/vue/goop.css'))
      const source = `\n@source ${JSON.stringify(vueDist)};\n`
      const TAILWIND_ROOT = /@import\s+(?:url\()?["']tailwindcss["']/
      addVitePlugin(
        {
          name: 'goopui:tailwind-source',
          enforce: 'pre',
          transform(code, id) {
            if (!/\.css(?:$|\?)/.test(id) || !TAILWIND_ROOT.test(code) || code.includes(source)) return
            return { code: code + source, map: null }
          },
        },
        { prepend: true },
      )
    }

    const defaults: GoopModuleDefaults = {}
    for (const key of ['preset', 'renderer', 'finish', 'splash', 'reducedMotion'] as const) {
      if (options[key] !== undefined) (defaults as Record<string, unknown>)[key] = options[key]
    }
    if (Object.keys(defaults).length) {
      addPluginTemplate({
        filename: 'goopui-config.mjs',
        getContents: () =>
          [
            `import { GoopPlugin } from '@goopui/vue'`,
            `import { defineNuxtPlugin } from '#app/nuxt'`,
            `export default defineNuxtPlugin({`,
            `  name: 'goopui:config',`,
            `  setup(nuxtApp) { nuxtApp.vueApp.use(GoopPlugin, ${JSON.stringify(defaults)}) },`,
            `})`,
          ].join('\n'),
      })
    }
  },
})

export default module

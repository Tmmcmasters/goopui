import type { GoopFinishName, GoopPreset, GoopRendererName, GoopSplashMode, PageTransitionDirection } from '@goopui/core'
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

/** Goo page transition options (serializable subset of `GoopPageTransitionProps`). */
export interface GoopModulePageTransition {
  /** Travel direction. Default 'down' (pours from the top, drains out the bottom). */
  direction?: PageTransitionDirection
  /** Wall fill (any CSS colour or `var()`). Default `--goop-page-transition`, then `--primary`. */
  color?: string
  /** Lip colour on the moving edges and bubble rims, or false. Default
   *  `--goop-page-transition-accent` if set. */
  accent?: string | false
  /** Soft glow through the band, or false. Default `--goop-page-transition-highlight` if set. */
  highlight?: string | false
  /** Total cover + reveal time (ms). Default ~1150. */
  duration?: number
  coverDuration?: number
  revealDuration?: number
  speed?: number
  /** Feel for the transition only (default: the module's `preset`). */
  preset?: GoopPreset
  /** A band that sweeps through (default), `false` for the full-screen wall, or the band's
   *  thickness as a fraction of the travel length. */
  band?: boolean | number
  /** See-through bubbles rising through the goo: `true` (default), `false` or 0..2. */
  bubbles?: boolean | number
  bulge?: boolean | number
  wobble?: boolean | number
  lag?: boolean | number
  zIndex?: number
  /** Give up waiting for `page:finish` after this many ms and reveal anyway. Default 2000. */
  timeout?: number
  /** Fade the new page in as it renders behind the band: an element selector (default
   *  '#__nuxt'), or false. */
  fade?: string | false
  /** Fade length (ms). Default 200. */
  fadeDuration?: number
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
  /**
   * Goo page transition on route changes (experimental). Off by default. `true` or options:
   * before each route change the goo pours over the viewport (navigation waits for it),
   * and drains once the new page has rendered (`page:finish`). Same-path changes (hash,
   * query) and the first load don't transition. Reduced motion: a quick fade. The live
   * handle is `useNuxtApp().$goopPageTransition` (null on the server).
   */
  pageTransition?: boolean | GoopModulePageTransition
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
      ...['reka-ui', 'cn', 'class-variance-authority', 'vue-sonner'].map((dep) => `@goopui/vue > ${dep}`),
    ]
    // vue-sonner keeps its toast queue in module state: GoopToaster and the app's `toast()`
    // must share one copy (pnpm can install two when their optional nuxt peers differ).
    nuxt.options.vite.resolve ||= {}
    nuxt.options.vite.resolve.dedupe = [...(nuxt.options.vite.resolve.dedupe ?? []), 'vue-sonner']

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

    if (options.pageTransition) {
      const { timeout = 2000, fade = '#__nuxt', fadeDuration = 200, ...pt } = options.pageTransition === true ? {} : options.pageTransition
      const rm = options.reducedMotion
      addPluginTemplate({
        filename: 'goopui-page-transition.client.mjs',
        mode: 'client',
        getContents: () =>
          [
            `import { createPageTransition } from '@goopui/core'`,
            `import { goopPageFadeIn, goopRouterTransition, toPageTransitionOptions } from '@goopui/vue'`,
            `import { defineNuxtPlugin } from '#app/nuxt'`,
            `export default defineNuxtPlugin({`,
            `  name: 'goopui:page-transition',`,
            `  setup(nuxtApp) {`,
            `    const options = toPageTransitionOptions(${JSON.stringify(pt)}, ${JSON.stringify({ preset: options.preset, ...(rm === undefined ? {} : { reducedMotion: rm }) })})`,
            `    const transition = createPageTransition(options)`,
            `    let timer = 0`,
            `    let swapped = false`,
            `    const reveal = () => { clearTimeout(timer); void transition.reveal() }`,
            `    goopRouterTransition(nuxtApp.$router, {`,
            `      cover: () => transition.cover(),`,
            `      reveal,`,
            `    }, { revealOn: 'manual' })`,
            `    // Reveal once the new page has rendered; never leave the screen covered.`,
            `    nuxtApp.$router.afterEach(() => { clearTimeout(timer); swapped = transition.phase !== 'idle'; if (swapped) timer = setTimeout(reveal, ${Number(timeout) || 2000}) })`,
            `    // The new page is in the DOM, not painted yet: fade it in behind the band so the swap never pops.`,
            `    nuxtApp.hook('page:finish', () => { if (swapped && !transition.reducedMotion) goopPageFadeIn(${JSON.stringify(fade)}, ${Number(fadeDuration) || 0}); swapped = false; requestAnimationFrame(reveal) })`,
            `    nuxtApp.hook('app:error', reveal)`,
            `    return { provide: { goopPageTransition: transition } }`,
            `  },`,
            `})`,
          ].join('\n'),
      })
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

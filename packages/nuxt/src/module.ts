import type { GoopFinishName, GoopPreset, GoopRendererName, GoopSplashMode, PageTransitionDirection } from '@goopui/core'
import { addComponent, addPluginTemplate, addVitePlugin, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { componentBaseName, goopComponents } from '@goopui/vue/manifest'
import type { NuxtModule } from '@nuxt/schema'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

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
  /**
   * Interaction sounds (Cuelume) on for every component by default. Default false. Install
   * `cuelume` (an optional peer dependency of @goopui/core) to hear them; without it sound is
   * a silent no-op with one console warning. Components can still opt in or out with `sound`.
   */
  sound?: boolean
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
  /** The band is the seam between the pages (default true): the new page behind it, the old
   *  one ahead of it, never a visible swap. Uses View Transitions (else a clone of the old
   *  page). `false`: the page swaps (and fades in) while the band is over the middle. */
  split?: boolean
  /** Give up waiting for `page:finish` after this many ms and reveal anyway. Default 2000. */
  timeout?: number
  /** Without the split: fade the new page in as it renders behind the band, an element
   *  selector (default '#__nuxt'), or false. */
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
   * a band of goo sweeps across as the seam between the old page and the new one (`split`,
   * with View Transitions), revealing the new page once it has rendered (`page:finish`). Same-path changes (hash,
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
      ...['reka-ui', 'cn', 'class-variance-authority', 'vue-sonner', 'embla-carousel-vue'].map((dep) => `@goopui/vue > ${dep}`),
    ]
    // vue-sonner keeps its toast queue in module state: GoopToaster and the app's `toast()`
    // must share one copy (pnpm can install two when their optional nuxt peers differ).
    // Only when the app has vue-sonner itself: `dedupe` resolves it from the app root, so with
    // vue-sonner only nested under @goopui/vue (pnpm without hoisting; npm in a Nuxt 3 app,
    // where vue-sonner's optional `nuxt ^4` peer makes npm nest it) every build failed with
    // `Rollup failed to resolve import "vue-sonner"`. Without its own copy the app can't call
    // `toast()` from another one, so there is nothing to share.
    if (nuxt.options.modulesDir.some((dir) => existsSync(join(dir, 'vue-sonner', 'package.json')))) {
      nuxt.options.vite.resolve ||= {}
      nuxt.options.vite.resolve.dedupe = [...(nuxt.options.vite.resolve.dedupe ?? []), 'vue-sonner']
    }

    for (const name of goopComponents) {
      addComponent({
        name: `${options.prefix}${componentBaseName(name)}`,
        export: name,
        filePath: '@goopui/vue',
      })
    }

    // The generated .nuxt/components.d.ts types each component as `typeof
    // import('@goopui/vue')[...]`, resolved from the app. An app that only lists @goopui/nuxt
    // (the docs' install) doesn't have @goopui/vue at its root with pnpm, so that import
    // failed and every auto-imported component was silently `any` in `nuxi typecheck` and the
    // editor. Point TypeScript at the copy this module resolves.
    const vueDir = dirname(dirname(await resolvePath('@goopui/vue/goop.css')))
    nuxt.hook('prepare:types', ({ tsConfig }) => {
      tsConfig.compilerOptions ||= {}
      tsConfig.compilerOptions.paths ||= {}
      tsConfig.compilerOptions.paths['@goopui/vue'] ||= [vueDir]
    })

    if (options.css) nuxt.options.css.push('@goopui/vue/goop.css')

    if (options.tailwindSource || options.css) {
      const goopCss = await resolvePath('@goopui/vue/goop.css')
      const source = `\n@source ${JSON.stringify(dirname(goopCss))};\n`
      const TAILWIND_ROOT = /@import\s+(?:url\()?["']tailwindcss["']/
      const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '')
      addVitePlugin(
        {
          name: 'goopui:tailwind-source',
          enforce: 'pre',
          transform(code, id) {
            if (!/\.css(?:$|\?)/.test(id)) return
            if (id.split('?')[0] === goopCss) {
              // Injected through `nuxt.options.css`, goop.css is its own root that Tailwind
              // never compiles, so its `@source "./"` (meant for `@import`ing it from a Tailwind
              // entry) would ship to the browser as-is and warn on every build.
              return options.css ? { code: code.replace(/^@source\s[^;]*;[^\S\n]*\n?/gm, ''), map: null } : undefined
            }
            // Comments don't count: goop.css's own header mentions `@import "tailwindcss"`.
            if (!options.tailwindSource || !TAILWIND_ROOT.test(stripComments(code)) || code.includes(source)) return
            return { code: code + source, map: null }
          },
        },
        { prepend: true },
      )
    }

    if (options.pageTransition) {
      const { timeout = 2000, fade = '#__nuxt', fadeDuration = 200, ...pt } = options.pageTransition === true ? {} : options.pageTransition
      const rm = options.reducedMotion
      const experimental = nuxt.options.experimental as { viewTransition?: unknown; navigationRepaint?: unknown }
      if (pt.split !== false && pt.band !== false && experimental.viewTransition) {
        // Two view transitions per navigation would cancel each other: ours does the job.
        useLogger('@goopui/nuxt').warn('`experimental.viewTransition` is turned off: `goop.pageTransition` runs its own view transition (set `split: false` to keep Nuxt\'s).')
        experimental.viewTransition = false
      }
      if (pt.split !== false && pt.band !== false) {
        // Nuxt's navigation repaint holds every navigation (beforeResolve) until a frame paints,
        // or 100ms. Split, the old page is already held as a view-transition snapshot by then,
        // so no frame paints and every click paid the full 100ms with the page frozen.
        experimental.navigationRepaint = false
      }
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
            `    let split = false`,
            `    const reveal = () => { clearTimeout(timer); void transition.reveal() }`,
            `    // A swipe-back the browser already animated (popstate with hasUAVisualTransition): no goo.`,
            `    let uaVisual = false`,
            `    window.addEventListener('popstate', (e) => { uaVisual = !!e.hasUAVisualTransition })`,
            `    goopRouterTransition(nuxtApp.$router, {`,
            `      cover: () => transition.cover(),`,
            `      reveal,`,
            `      splits: () => transition.seam !== null,`,
            `    }, { revealOn: 'manual', when: (to, from) => { const ua = uaVisual; uaVisual = false; return !ua && from.matched.length > 0 && to.path !== from.path } })`,
            `    // Reveal once the new page has rendered; never leave the screen covered.`,
            `    nuxtApp.$router.afterEach(() => { clearTimeout(timer); swapped = transition.phase !== 'idle'; split = swapped && transition.seam !== null; if (swapped) timer = setTimeout(reveal, ${Number(timeout) || 2000}) })`,
            `    nuxtApp.hook('page:finish', () => {`,
            `      const was = swapped`,
            `      swapped = false`,
            `      // Split: the band is the seam, nothing swaps in view. Reveal now: a view transition`,
            `      // pauses rendering (and frames) until it does.`,
            `      if (was && split) return reveal()`,
            `      // The new page is in the DOM, not painted yet: fade it in behind the band so the swap never pops.`,
            `      if (was && !transition.reducedMotion) goopPageFadeIn(${JSON.stringify(fade)}, ${Number(fadeDuration) || 0})`,
            `      requestAnimationFrame(reveal)`,
            `    })`,
            `    nuxtApp.hook('app:error', reveal)`,
            `    return { provide: { goopPageTransition: transition } }`,
            `  },`,
            `})`,
          ].join('\n'),
      })
    }

    const defaults: GoopModuleDefaults = {}
    for (const key of ['preset', 'renderer', 'finish', 'splash', 'reducedMotion', 'sound'] as const) {
      if (options[key] !== undefined) (defaults as Record<string, unknown>)[key] = options[key]
    }
    if (options.sound) {
      // Client only: load Cuelume and bind its listeners once the app starts (the server
      // renders the cue attributes but never loads audio).
      addPluginTemplate({
        filename: 'goopui-sound.client.mjs',
        mode: 'client',
        getContents: () =>
          [
            `import { enableSound } from '@goopui/core'`,
            `import { defineNuxtPlugin } from '#app/nuxt'`,
            `export default defineNuxtPlugin({`,
            `  name: 'goopui:sound',`,
            `  setup() { void enableSound() },`,
            `})`,
          ].join('\n'),
      })
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

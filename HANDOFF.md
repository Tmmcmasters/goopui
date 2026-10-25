# Handoff: goopUI scaffold → groundwork session

Written 2026-10-25. Start the next Claude session in `/Volumes/CrucialP3/codeProjects/goopUI`. `CLAUDE.md` loads automatically and covers layout, tooling, and gotchas; this note covers what was done and what comes next.

## What exists

- pnpm 12 workspace + Turborepo + Changesets, git initialized on `main` (no commits yet).
- `@goopui/core` (`packages/core`): builds with tsdown. Currently only exports `VERSION`, a `GoopOptions` type, and `defaultGoopOptions` (blur, contrast, reduced-motion). It's a placeholder for the real engine.
- `@goopui/vue`, `@goopui/react`, `@goopui/svelte`: placeholders that re-export core. Marked `private: true` so nothing gets published by accident.
- `apps/playground`: Nuxt 4.6 app that imports `@goopui/core` and renders it.

Verified working: `pnpm install`, `pnpm build` (all 5 tasks), `pnpm typecheck`, and the built playground serving a page.

Pinned versions: Nuxt 4.6.2, Vue 3.5, TypeScript 5.9.3 (left on 5.x on purpose, see CLAUDE.md), tsdown 0.23, Turbo 2.11, Vitest 5, Tailwind 4.3 available. shadcn-vue 2.8 / reka-ui 2.11 are the current shadcn options for Vue.

npm: `@goopui/core` and the `@goopui` scope were both unclaimed on 2026-10-25. **Create the `goopui` npm org soon** so nobody else takes the scope.

## Next steps (suggested order)

1. **Make the shadcn decisions (see open questions)**, then set up Tailwind v4 + shadcn-vue in the playground.
2. **Build the goo engine in `@goopui/core`**:
   - SVG gooey filter factory (`feGaussianBlur` → `feColorMatrix` alpha contrast → `feComposite`), injected once per document with unique IDs (SSR-safe: no `document` access at import time).
   - Drip primitive: blobs that stretch, neck, and detach. Start with CSS/SVG, and consider canvas/WebGL metaballs only if performance requires it.
   - Pointer/hover tracking helpers, `prefers-reduced-motion` handling, cleanup/teardown API.
3. **Set up `@goopui/vue` for real**: SFC build (tsdown + `unplugin-vue`, or Vite library mode), `vue` as a devDependency, and a Nuxt module (`@goopui/nuxt` or `@goopui/vue/nuxt`) for auto-imports.
4. **First components, in the playground**: GoopButton (drips on hover), GoopBlob/GoopBackground, GoopToggle, GoopLoader. Use shadcn's API shape (variants via `cva`, `class` passthrough, `asChild`-style composition from reka-ui).
5. Vitest for core (filter generation, drip math), plus visual checks in the playground.
6. Later: docs site (`apps/docs`), React and Svelte ports, CI + changesets release workflow.

Useful skills for that session: `animate`, `apple-design` / `emil-design-eng` for motion feel, `impeccable` for component design, `break-ui` for stress-testing.

## Open questions for the user

- **Distribution model.** shadcn is copy-paste (a CLI registry), but goopUI is meant to ship as npm packages. Options: npm packages only; npm packages plus a shadcn-compatible registry so people can `npx shadcn-vue add <goop-url>`; or a hybrid where core is on npm and styled components come from the registry.
- **Base primitives.** Wrap reka-ui (what shadcn-vue uses) for accessible behavior, or keep components headless-free and lighter?
- **Styling.** Require Tailwind v4 (shadcn style), or ship plain CSS + CSS variables so non-Tailwind users can use it too?
- **Rendering tech for drips.** SVG filters (simple, can be heavy on large areas) vs canvas/WebGL metaballs (faster, more complex).
- License (MIT assumed in the package.json files) and GitHub repo name/visibility.

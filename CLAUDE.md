# goopUI

UI library of interactive gooey, dripping elements. Ships as npm packages for Vue, React, and Svelte. Built Nuxt-first: the Vue package and Nuxt playground prove the API before React/Svelte ports.

## Layout

- `packages/core`: `@goopui/core`. Plain TS + DOM only. Never import Vue, React, or Svelte here. All effect logic (SVG goo filter, drip simulation, pointer tracking, reduced-motion handling) lives here so adapters stay thin.
- `packages/vue|react|svelte`: framework adapters. Depend on `@goopui/core` (`workspace:*`), declare the framework as a peer dependency. All three are `"private": true` until they are ready to publish (Vue first, then React/Svelte once the Vue API settles).
  - `@goopui/vue`: shadcn-style components (`GoopButton`, ...) on reka-ui. Engine options become props in ONE file, `src/goop-props.ts` (derived from core's `GOOP_DEFAULTS` / `GoopOptions`; a typecheck guard fails when core adds an option it doesn't handle). `src/use-goop.ts` attaches on mount. `src/goop.css` holds `@source`, adapter tokens and layer rules. Component list in `src/manifest.ts`.
- `packages/nuxt`: `@goopui/nuxt`, built with `@nuxt/module-builder`. Auto-imports `@goopui/vue` components (`prefix`, default `Goop`), injects `goop.css`, adds `@source` to Tailwind entry CSS, takes global `preset`/`renderer`/`finish`/`splash` defaults.
- `apps/playground`: Nuxt 4 app (`app/` directory structure). Where components are built and eyeballed.

## Plan

All product and architecture decisions are in `HANDOFF.md`. Read it before building components.

## Tooling

- pnpm 12 workspaces + Turborepo. Run tasks from the root: `pnpm build`, `pnpm typecheck`, `pnpm dev:playground`.
- `@goopui/core` (and the React/Svelte placeholders) build with tsdown: `dist/index.mjs` + `dist/index.d.mts`.
- `@goopui/vue` builds with mkdist via `packages/vue/build.mjs`: file-to-file, `.vue` SFCs ship as SFCs (script transpiled to JS), `.d.ts` via vue-tsc, `goop.css` copied verbatim. The script excludes `._*` files and FAILS if any SFC declaration is empty: mkdist + vue-tsc silently emit an empty `.vue.d.ts` when a public type can't be named (e.g. a type core uses in an option but doesn't export). Export such types from core.
- `@goopui/nuxt` builds with `nuxt-module-build build` (`dist/module.mjs`, `dist/types.d.mts`).
- Library packages build in `prepare`, so `pnpm install` leaves them built before the playground's `nuxt prepare` postinstall loads `@goopui/nuxt`.
- Tests: Vitest in `packages/core` and `packages/vue` (@vue/test-utils + happy-dom; SSR tests use the node environment).
- Changesets for versioning; all `@goopui/*` packages are versioned together.
- TypeScript is pinned to 5.9 on purpose: vue-tsc / svelte-check tooling may not be ready for TS 7 yet.

## Gotchas

- The parent folder `codeProjects/` has its own `package.json` and `node_modules`. `shamefullyHoist: true` in `pnpm-workspace.yaml` stops Node/Nitro from resolving stale packages from there. Don't remove it unless that parent `node_modules` is gone.
- pnpm 12 blocks dependency install scripts by default. Allow new ones with `pnpm approve-builds <pkg>` (writes `allowBuilds` in `pnpm-workspace.yaml`).
- Always honor `prefers-reduced-motion` in every animated component.
- exFAT AppleDouble files (`._*`) break builds. `pnpm clean:dot` removes them. If a Nuxt build fails with `ENOENT ... chmod .../._*.json`, delete that app's `.nuxt` and `.output` (stale ones left by a dev server) and rebuild.
- Tailwind v4 only scans `@source` inside the CSS root that imports `tailwindcss`. A file added through `nuxt.options.css` is a separate root, so its `@source` does nothing; that's why `@goopui/nuxt` appends `@source` to Tailwind entry files (verified: without it the goo variant classes are not generated).

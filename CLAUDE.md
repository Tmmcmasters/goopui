# goopUI

UI library of interactive gooey, dripping elements. Ships as npm packages for Vue, React, and Svelte. Built Nuxt-first: the Vue package and Nuxt playground prove the API before React/Svelte ports.

## Layout

- `packages/core`: `@goopui/core`. Plain TS + DOM only. Never import Vue, React, or Svelte here. All effect logic (SVG goo filter, drip simulation, pointer tracking, reduced-motion handling) lives here so adapters stay thin.
- `packages/vue|react|svelte`: framework adapters. Depend on `@goopui/core` (`workspace:*`), declare the framework as a peer dependency. All three are `"private": true` until they have real components (Vue first, then React/Svelte once the Vue API settles).
- `apps/playground`: Nuxt 4 app (`app/` directory structure). Where components are built and eyeballed.

## Tooling

- pnpm 12 workspaces + Turborepo. Run tasks from the root: `pnpm build`, `pnpm typecheck`, `pnpm dev:playground`.
- Libraries build with tsdown, which emits `dist/index.mjs` + `dist/index.d.mts` (package `exports` point there).
- Changesets for versioning; all `@goopui/*` packages are versioned together.
- TypeScript is pinned to 5.9 on purpose: vue-tsc / svelte-check tooling may not be ready for TS 7 yet.

## Gotchas

- The parent folder `codeProjects/` has its own `package.json` and `node_modules`. `shamefullyHoist: true` in `pnpm-workspace.yaml` stops Node/Nitro from resolving stale packages from there. Don't remove it unless that parent `node_modules` is gone.
- pnpm 12 blocks dependency install scripts by default. Allow new ones with `pnpm approve-builds <pkg>` (writes `allowBuilds` in `pnpm-workspace.yaml`).
- Always honor `prefers-reduced-motion` in every animated component.

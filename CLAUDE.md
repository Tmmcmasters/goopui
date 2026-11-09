# goopUI

UI library of interactive gooey, dripping elements. Ships as npm packages for Vue, React, and Svelte. Built Nuxt-first: the Vue package and Nuxt playground prove the API before React/Svelte ports.

## Layout

- `packages/core`: `@goopui/core`. Plain TS + DOM only. Never import Vue, React, or Svelte here. All effect logic (SVG goo filter, drip simulation, pointer tracking, reduced-motion handling) lives here so adapters stay thin.
- `packages/vue|react|svelte`: framework adapters. Depend on `@goopui/core` (`workspace:*`), declare the framework as a peer dependency. All three are `"private": true` until they are ready to publish (Vue first, then React/Svelte once the Vue API settles).
  - `@goopui/vue`: shadcn-style components (`GoopButton`, ...) on reka-ui. Engine options become props in ONE file, `src/goop-props.ts` (derived from core's `GOOP_DEFAULTS` / `GoopOptions`; a typecheck guard fails when core adds an option it doesn't handle). `src/use-goop.ts` attaches on mount. `src/goop.css` holds `@source`, adapter tokens and layer rules. Component list in `src/manifest.ts`.
  - `@goopui/react`: the same idea for React: shadcn/ui (React, radix-nova classes) on Radix UI, prop mapping in `src/goop-props.ts` with the same guards (a test checks it sends core the same options as Vue's), `GoopProvider` for app-wide defaults + sound. Components start with `'use client'`; tsdown builds file-to-file (`unbundle`) so each keeps it, and `scripts/check-dist.mjs` fails the build otherwise. Five components so far (Button, Switch, Checkbox, Tabs, Dialog).
- `packages/nuxt`: `@goopui/nuxt`, built with `@nuxt/module-builder`. Auto-imports `@goopui/vue` components (`prefix`, default `Goop`), injects `goop.css`, adds `@source` to Tailwind entry CSS, takes global `preset`/`renderer`/`finish`/`splash` defaults.
- `apps/playground`: Nuxt 4 app (`app/` directory structure). Where components are built and eyeballed.

## Plan

All product and architecture decisions are in `HANDOFF.md`. Read it before building components.

## Tooling

- pnpm 12 workspaces + Turborepo. Run tasks from the root: `pnpm build`, `pnpm typecheck`, `pnpm dev:playground`.
- `@goopui/core` (and the Svelte placeholder) build with tsdown: `dist/index.mjs` + `dist/index.d.mts`. `@goopui/react` builds with tsdown unbundled (one `.mjs` per source file).
- `@goopui/vue` builds with mkdist via `packages/vue/build.mjs`: file-to-file, `.vue` SFCs ship as SFCs (script transpiled to JS), `.d.ts` via vue-tsc, `goop.css` copied verbatim. The script excludes `._*` files and FAILS if any SFC declaration is empty: mkdist + vue-tsc silently emit an empty `.vue.d.ts` when a public type can't be named (e.g. a type core uses in an option but doesn't export). Export such types from core.
- `@goopui/nuxt` builds with `nuxt-module-build build` (`dist/module.mjs`, `dist/types.d.mts`).
- Library packages build in `prepare`, so `pnpm install` leaves them built before the playground's `nuxt prepare` postinstall loads `@goopui/nuxt`.
- Tests: Vitest in `packages/core`, `packages/vue` (@vue/test-utils + happy-dom) and `packages/react` (@testing-library/react + happy-dom); SSR tests use the node environment.
- Changesets for versioning; all `@goopui/*` packages are versioned together.
- TypeScript is pinned to 5.9 on purpose: vue-tsc / svelte-check tooling may not be ready for TS 7 yet.

## Verification

- Locally, agents run `pnpm build --concurrency=1`, `pnpm typecheck`, the tests of the packages they touched (`pnpm --filter @goopui/<pkg> test`), and a headless look at the pages they changed.
- `pnpm check:hydration` and `pnpm check:package-managers` run in CI on every push and PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml); package-managers only when package manifests, entry points, build configs or the lockfile change). Run them locally only to debug a CI failure; the failing run uploads its logs as artifacts.
- `pnpm check:demos` also runs in CI on every push and PR (the `demos` job): it drives every component demo in Vue and React (desktop + 390px touch) and fails on console errors, empty demos, overlays stuck open after Escape, and serious/critical axe-core violations (light + dark). Locally: `pnpm check:demos --no-build <slug>...`.
- Each worktree needs its own Nuxt Content database: `CONTENT_DB_DIR=$PWD/.data/content` when two worktrees build www at once.
- On an exFAT `ENOENT ... chmod .../._*` error: delete the app's `.nuxt`, `.output` and `node_modules/.cache/nuxt`, run `pnpm clean:dot`, rebuild.
- Don't run a dev server while `check:package-managers` runs locally (it serves the consumer apps on port 4317 and needs the whole machine).

## Gotchas

- The parent folder `codeProjects/` has its own `package.json` and `node_modules`. `shamefullyHoist: true` in `pnpm-workspace.yaml` stops Node/Nitro from resolving stale packages from there. Don't remove it unless that parent `node_modules` is gone.
- pnpm 12 blocks dependency install scripts by default. Allow new ones with `pnpm approve-builds <pkg>` (writes `allowBuilds` in `pnpm-workspace.yaml`).
- Always honor `prefers-reduced-motion` in every animated component.
- exFAT AppleDouble files (`._*`) break builds. `pnpm clean:dot` removes them. If a Nuxt build fails with `ENOENT ... chmod .../._*.json`, delete that app's `.nuxt` and `.output` (stale ones left by a dev server) and rebuild.
- Tailwind v4 only scans `@source` inside the CSS root that imports `tailwindcss`. A file added through `nuxt.options.css` is a separate root, so its `@source` does nothing; that's why `@goopui/nuxt` appends `@source` to Tailwind entry files (verified: without it the goo variant classes are not generated).

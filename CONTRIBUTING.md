# Contributing to goopUI

Thanks for helping make the web gooier. This guide covers how the repo is laid out, the rules every component follows, and how to get a PR merged.

## Setup

- Node 24 (`.nvmrc`) and pnpm 12 (`corepack enable` or `npm i -g pnpm@12`).
- `pnpm install` installs everything and builds the library packages (they build in `prepare`).
- `pnpm dev:playground` runs the Nuxt playground, which has a compare page and a props panel per component.

pnpm 12 blocks dependency install scripts by default. If a new dependency needs one, allow it with `pnpm approve-builds <pkg>`.

## Layout

| Path | What lives there |
| --- | --- |
| `packages/core` | `@goopui/core`: plain TypeScript + DOM. All effect logic lives here. **Never import Vue, React, or Svelte.** |
| `packages/vue` | `@goopui/vue`: thin shadcn-style components on reka-ui. Engine options become props in one file, `src/goop-props.ts`. New components go in `src/manifest.ts`. |
| `packages/nuxt` | `@goopui/nuxt`: the Nuxt module. |
| `packages/react`, `packages/svelte` | Placeholders until the Vue API settles. |
| `apps/playground` | Where components are built and tried out. |
| `apps/www` | Landing page and docs (Nuxt Content). |
| `apps/soon` | The coming-soon site at goop.timmcmasters.work. |
| `apps/promo` | Remotion promo videos. |
| `brand` | Logo sources and tools. |

## Component rules

1. **Mirror shadcn.** Wrap the same reka-ui primitive shadcn-vue uses, with the same API: cva variants, `class` passthrough, and `asChild`.
2. **Logic in core, adapters thin.** Simulation, rendering and pointer handling belong in `@goopui/core` so every framework port shares them.
3. **Every effect is toggleable**, and the `subtle | playful | wild` presets apply. Precedence: option > CSS var > preset > default.
4. **Always honor `prefers-reduced-motion`.** Keep the goo's shape static, with no simulation, splash, or drips.
5. **Accessibility first.** The goo layer is `aria-hidden` and sits behind the real, unfiltered content.
6. **Tests.** Add Vitest tests in `packages/core` and/or `packages/vue`.

## Pull requests

1. Fork, then branch from `main`.
2. Make your change, and add a playground page or example if it's visual. A short screen recording in the PR helps a lot.
3. Run `pnpm build && pnpm typecheck && pnpm test`.
4. If a published package changes, run `pnpm changeset` and describe the change. All `@goopui/*` packages are versioned together.
5. Use [Conventional Commits](https://www.conventionalcommits.org) for commit messages and PR titles, e.g. `feat(vue): GoopDialog` or `fix(core): ...`.

CI runs build, typecheck and tests on every PR.

## Reporting bugs and ideas

Use the issue templates. For bugs, include the browser, the framework, whether reduced motion is on, and a minimal reproduction.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

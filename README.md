<p align="center">
  <img src="brand/puddle/lockup.svg" alt="goopUI" width="320">
</p>

<p align="center"><strong>Components that drip.</strong></p>

<p align="center">
  <a href="https://github.com/Tmmcmasters/goopui/actions/workflows/ci.yml"><img src="https://github.com/Tmmcmasters/goopui/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1fa64a" alt="MIT license"></a>
</p>

goopUI is a goopy mirror of the [shadcn](https://ui.shadcn.com) catalog: the same accessible primitives and the same API, with gooey, dripping, physics-driven effects layered on top. Poke a few at **[goop.timmcmasters.work](https://goop.timmcmasters.work)**.

> **Status: pre-alpha.** Nothing is on npm yet. Vue (and Nuxt) come first; React and Svelte follow once the Vue API settles.

## Components

Button, Spinner, Switch, Checkbox, RadioGroup, Popover, DropdownMenu, Tabs, Tooltip, Slider, Progress, Toaster. More are on the way (Dialog, Sheet, Drawer, Accordion, Input, Select, Toggle).

Every effect is individually toggleable, comes with `subtle | playful | wild` presets, and respects `prefers-reduced-motion`.

## Packages

| Package | What it is | Status |
| --- | --- | --- |
| [`@goopui/core`](packages/core) | Framework-agnostic engine: goo rendering (SVG / canvas / WebGL), drip and fluid physics, pointer tracking, reduced-motion handling | pre-alpha |
| [`@goopui/vue`](packages/vue) | Vue 3 components on [reka-ui](https://reka-ui.com), styled with Tailwind v4 + shadcn tokens | pre-alpha |
| [`@goopui/nuxt`](packages/nuxt) | Nuxt module: auto-imports, CSS, Tailwind `@source`, global defaults | pre-alpha |
| [`@goopui/react`](packages/react) | React components | planned |
| [`@goopui/svelte`](packages/svelte) | Svelte components | planned |

## Usage (Nuxt, once published)

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@goopui/nuxt'],
  goop: { preset: 'playful' },
})
```

```vue
<template>
  <GoopButton>Poke me</GoopButton>
</template>
```

## Development

Requires Node 24 (see `.nvmrc`) and pnpm 12.

```bash
pnpm install          # also builds the library packages
pnpm dev:playground   # component playground
pnpm dev:www          # docs site at http://localhost:3001
pnpm build
pnpm typecheck
pnpm test
```

The repo layout and the architecture rules are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Issues and PRs are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) first. To report a security issue, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Timothy McMasters

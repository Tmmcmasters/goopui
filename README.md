# goopUI

Interactive gooey, dripping UI elements for **Vue**, **React**, and **Svelte**.

> Status: pre-alpha scaffold. Nothing is published yet.

## Packages

| Package | Purpose | Status |
| --- | --- | --- |
| `@goopui/core` | Framework-agnostic engine: gooey SVG filters, drip physics, DOM helpers | scaffolded |
| `@goopui/vue` | Vue 3 components (Nuxt-first MVP) | placeholder |
| `@goopui/react` | React 19 components | placeholder |
| `@goopui/svelte` | Svelte 5 components | placeholder |
| `apps/playground` | Nuxt 4 app for building and testing components | running |

## Development

```bash
pnpm install
pnpm dev:playground   # Nuxt playground at http://localhost:3000
pnpm build            # build every package (Turborepo)
pnpm typecheck
pnpm changeset        # record a change for release
```

Requires Node 22+ and pnpm 12.

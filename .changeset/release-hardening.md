---
'@goopui/vue': patch
'@goopui/nuxt': patch
---

Install fixes found by testing the packed packages in real apps:

- `@goopui/nuxt`: auto-imported components are typed again with pnpm. The generated `components.d.ts` imports `@goopui/vue`, which an app that only installs `@goopui/nuxt` can't resolve under pnpm, so every component was `any`; the module now maps `@goopui/vue` for TypeScript.
- `@goopui/nuxt`: builds no longer fail with `Rollup failed to resolve import "vue-sonner"` when the app doesn't have its own `vue-sonner` (pnpm, or npm in a Nuxt 3 app). `vue-sonner` is only deduped when the app installs it.
- `@goopui/vue`: declarations use explicit `.js` / `/index.js` relative imports, so apps on `moduleResolution: "node16"` / `"nodenext"` get types.
- `@goopui/vue`: the `vue` peer is now `^3.5.2`. Vue 3.5.0 and 3.5.1 run, but their types turn every component into `any`.

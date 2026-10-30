# @goopui/nuxt

Nuxt module for [goopUI](https://goop.timmcmasters.work): gooey, dripping, shadcn-style components. It auto-imports every [`@goopui/vue`](https://www.npmjs.com/package/@goopui/vue) component (`<GoopButton>`, `<GoopDialog>`, `<GoopSelect>`, ...), injects `goop.css`, and points Tailwind v4 at the component classes.

> **Alpha.** APIs may change between `0.x` releases. Docs and demos: https://goop.timmcmasters.work · Source: https://github.com/Tmmcmasters/goopui

## Install

```sh
npx nuxi module add @goopui/nuxt
# or: npm install @goopui/nuxt
```

Requires Nuxt 3.13+ or 4 and Tailwind CSS v4 (`@tailwindcss/vite`). The components use shadcn theme tokens (`--primary`, `--background`, `--border`, ...), so set up a [shadcn-vue](https://www.shadcn-vue.com) theme or define those CSS variables yourself.

```ts
// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@goopui/nuxt'],
  css: ['~/assets/css/main.css'], // contains @import "tailwindcss";
  vite: { plugins: [tailwindcss()] },
  goop: {
    // all optional
    prefix: 'Goop',      // component prefix: <GoopButton>
    preset: 'playful',   // 'subtle' | 'playful' | 'wild'
    renderer: 'svg',     // 'svg' | 'canvas'
  },
})
```

## Usage

```vue
<template>
  <GoopButton>Click me</GoopButton>
</template>
```

## License

MIT

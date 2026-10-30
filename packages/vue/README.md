# @goopui/vue

Gooey, dripping, shadcn-style components for Vue 3: buttons, dialogs, selects, menus, sliders, toasts and more, built on [reka-ui](https://reka-ui.com) with the [`@goopui/core`](https://www.npmjs.com/package/@goopui/core) engine attached. Every component honors `prefers-reduced-motion`.

> **Alpha.** APIs may change between `0.x` releases. Docs and demos: https://goop.timmcmasters.work · Source: https://github.com/Tmmcmasters/goopui

Using Nuxt? Install [`@goopui/nuxt`](https://www.npmjs.com/package/@goopui/nuxt) instead: it auto-imports the components and wires up the styles.

## Install

```sh
npm install @goopui/vue vue-sonner
```

Requires Vue 3.5+ and Tailwind CSS v4. The components use shadcn theme tokens (`--primary`, `--background`, `--border`, ...), so set up a [shadcn-vue](https://www.shadcn-vue.com) theme or define those CSS variables yourself.

Import the styles once from your Tailwind entry CSS, after Tailwind:

```css
@import "tailwindcss";
@import "@goopui/vue/goop.css";
```

## Usage

```vue
<script setup lang="ts">
import { GoopButton } from '@goopui/vue'
</script>

<template>
  <GoopButton>Click me</GoopButton>
  <GoopButton variant="outline" preset="wild">Wild</GoopButton>
</template>
```

App-wide defaults (optional):

```ts
import { GoopPlugin } from '@goopui/vue'

app.use(GoopPlugin, { preset: 'subtle', renderer: 'canvas' })
```

`.vue` files ship as SFCs, so your bundler (Vite with `@vitejs/plugin-vue`) compiles them.

## License

MIT

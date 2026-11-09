# @goopui/react

Gooey, dripping [shadcn/ui](https://ui.shadcn.com) components for React, built on [Radix UI](https://www.radix-ui.com) with the [`@goopui/core`](https://www.npmjs.com/package/@goopui/core) engine attached. Same names, parts, props and classes as shadcn/ui (cva variants, `className`, `asChild`), plus goo. Every component honors `prefers-reduced-motion`.

> **Alpha.** APIs may change between `0.x` releases, and the React port is still catching up with [`@goopui/vue`](https://www.npmjs.com/package/@goopui/vue): the docs say which components are ported. Docs and demos: https://goop.timmcmasters.work/react/docs · Source: https://github.com/Tmmcmasters/goopui

## Install

```sh
npm install @goopui/react
```

Requires React 18 or 19 (with `react-dom`) and Tailwind CSS v4. Radix UI (`radix-ui`) and the `@goopui/core` engine are installed with it. Interaction sounds ([Cuelume](https://www.npmjs.com/package/cuelume)) come installed: Next.js' Turbopack can't build an optional dynamic import that isn't there, and Cuelume only loads when a component has `sound` on. The components use shadcn theme tokens (`--primary`, `--background`, `--popover`, `--border`, ...), so set up a [shadcn/ui](https://ui.shadcn.com/docs/theming) theme (with shadcn's base layer, `* { @apply border-border outline-ring/50 }`) or define those CSS variables yourself.

Import the styles once from your Tailwind entry CSS, after Tailwind. That one line also adds the `@source` that lets Tailwind see the components' classes:

```css
@import "tailwindcss";
@import "@goopui/react/goop.css";
```

## Usage

```tsx
import { GoopButton, GoopSwitch } from '@goopui/react'

export function Example() {
  return (
    <>
      <GoopButton>Click me</GoopButton>
      <GoopButton variant="outline" preset="wild">Wild</GoopButton>
      <GoopSwitch defaultChecked />
    </>
  )
}
```

App-wide defaults (optional): engine options plus `sound`.

```tsx
import { GoopProvider } from '@goopui/react'

<GoopProvider preset="subtle" renderer="canvas" sound>{children}</GoopProvider>
```

### Next.js (App Router)

Every component file is a client component (`'use client'`), so you can render them from Server Components. They server-render shadcn's exact markup, and the goo attaches after hydration, so there's nothing to mismatch. Put the optional `GoopProvider` in `app/layout.tsx` and the two `@import` lines in `app/globals.css` (Next.js' Tailwind v4 setup, via `@tailwindcss/postcss`).

## Props

- Every engine option of `@goopui/core` is a prop (`dripSize={9}`, `preset="wild"`, `finish="oil"`). Feature toggles also take a boolean: `shockwave={false}` turns it off, `taffy` turns it on at the preset's strength.
- `goo={false}` renders the plain shadcn component.
- `ref` is the DOM element, like shadcn. `goopRef` receives the engine API (`drip()`, `press()`, `handle`, ...).
- Precedence: prop, then the `goop` object, then `<GoopProvider>`, then `--goop-*` CSS variables, then the preset.

## License

MIT

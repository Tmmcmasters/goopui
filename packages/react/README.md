# @goopui/react

Gooey, dripping [shadcn/ui](https://ui.shadcn.com) components for React, built on [Radix UI](https://www.radix-ui.com) with the [`@goopui/core`](https://www.npmjs.com/package/@goopui/core) engine attached. Same names, parts, props and classes as shadcn/ui (cva variants, `className`, `asChild`), plus goo. Every component honors `prefers-reduced-motion`.

> **Alpha, not published yet.** The React port has five components so far: Button, Switch, Checkbox, Tabs and Dialog. Docs and demos: https://goop.timmcmasters.work/react/docs · Source: https://github.com/Tmmcmasters/goopui

## Install

```sh
npm install @goopui/react
```

Requires React 18 or 19 and Tailwind CSS v4. The components use shadcn theme tokens (`--primary`, `--background`, `--popover`, `--border`, ...), so set up a shadcn/ui theme or define those CSS variables yourself.

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

Every component file is a client component (`'use client'`), so you can render them from Server Components. They server-render shadcn's exact markup, and the goo attaches after hydration, so there's nothing to mismatch. Put the optional `GoopProvider` in `app/layout.tsx`.

## Props

- Every engine option of `@goopui/core` is a prop (`dripSize={9}`, `preset="wild"`, `finish="oil"`). Feature toggles also take a boolean: `shockwave={false}` turns it off, `taffy` turns it on at the preset's strength.
- `goo={false}` renders the plain shadcn component.
- `ref` is the DOM element, like shadcn. `goopRef` receives the engine API (`drip()`, `press()`, `handle`, ...).
- Precedence: prop, then the `goop` object, then `<GoopProvider>`, then `--goop-*` CSS variables, then the preset.

## License

MIT

# @goopui/core

Framework-agnostic engine for goopUI: gooey filters, drip physics, and DOM helpers. Not usually installed directly; use `@goopui/vue`, `@goopui/react`, or `@goopui/svelte`.

```ts
import { attachGoop } from '@goopui/core'

const goop = attachGoop(buttonEl, { dripCount: 2 })
goop.update() // re-read --goop-* CSS vars
goop.destroy()
```

The host's goo color comes from `--goop-color` (falls back to `currentColor`). All tuning knobs and their defaults live in `src/constants.ts` (`GOOP_DEFAULTS` for per-element `--goop-*` vars, `GOOP_PHYSICS` for engine feel).

## Feel check

```sh
pnpm --filter @goopui/core demo   # builds, then serves http://localhost:4173/demo/
```

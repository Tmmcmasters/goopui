# @goopui/core

Framework-agnostic engine for [goopUI](https://goop.timmcmasters.work): gooey filters, drip physics, and DOM helpers. Plain TypeScript and DOM, no framework. Not usually installed directly: use [`@goopui/vue`](https://www.npmjs.com/package/@goopui/vue) or [`@goopui/nuxt`](https://www.npmjs.com/package/@goopui/nuxt) (React and Svelte adapters are coming).

> **Alpha.** APIs may change between `0.x` releases. Docs: https://goop.timmcmasters.work · Source: https://github.com/Tmmcmasters/goopui

```sh
npm install @goopui/core
```

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

## Renderers

Two renderers sit behind the same `GoopRenderer` seam and consume the same sim data:

```ts
attachGoop(el)                          // 'svg' (default): SVG goo filter on DOM spans
attachGoop(el, { renderer: 'canvas' })  // WebGL2 metaballs, Canvas 2D fallback
attachGoop(el, { renderer: makeCanvasRenderer({ backend: '2d' }) })
```

The canvas renderer gives each element its own small 2D `<canvas>` in the same z-index -1 layer the SVG renderer uses, so scrolling, clipping and stacking are unchanged. One shared WebGL2 context per document renders every dirty instance in a single atlas batch, so 200 buttons still use one context. Without WebGL2 (or after a context loss) it draws with Canvas 2D and applies the same SVG filter via CSS, and it switches back when the context is restored.

`--goop-blur` and `--goop-threshold` mean exactly the same thing in both renderers. `--goop-contrast` sets the edge ramp (1/contrast in alpha) in both, but the canvas edge never gets sharper than about one device pixel, so high contrast stays anti-aliased instead of aliasing. The canvas renderer reads `--goop-color` from computed style; it repaints on hover/focus, class/style changes, color transitions and theme changes on `<html>`/`<body>`. Call `handle.update()` after any other color change made while the goo is idle.

Finish: `attachGoop(el, { finish: 'oil' })` or `--goop-finish: oil`, tuned with `--goop-oil-intensity` (0-1, default 0.6), `--goop-oil-scale` (band size multiplier) and `--goop-oil-shift` (thickness offset in cycles). The canvas renderer shades a thin-film interference sheen from the goo's surface normals, with a specular that follows the pointer and bands that flow and stretch with pointer velocity. Drips and particles carry it too. Under reduced motion the sheen is static. Its 2D fallback uses a banded gradient clipped to the goo.

`acquireGoopOverlay(document, { renderer, color, finish })` gives a shared, fixed, full-viewport goo surface (viewport px) for goo that leaves its component, such as splash particles.

Compare page: run the demo, then open `/demo/compare.html` (side by side, stress N=10/50/200, a 1200x600 surface, overlay particles).

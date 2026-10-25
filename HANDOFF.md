# goopUI plan (decisions locked 2026-10-25)

Repo: private `github.com/Tmmcmasters/goopui`. npm org `goopui` claimed. License MIT.

## Product

goopUI is a goopy mirror of the shadcn catalog. Each component is built on the same reka-ui primitive shadcn-vue uses, with the same API shape (cva variants, `class` passthrough, `asChild` via reka's `Primitive`). Distribution is npm packages for v0.x; keep components thin so a shadcn registry can be added later.

## Architecture

- `@goopui/core`: attach-style API on elements, e.g. `attachGoop(el, opts)` / `attachDrips(el, opts)` returning `{ update(opts), destroy() }`. SVG filter defs are injected once per document and ref-counted; no `document` access at import (SSR-safe). Drips use a tiny spring/gravity integrator on one shared rAF loop that sleeps when idle; interruptible; transform/opacity only; zero dependencies. Renderer is behind an interface so a canvas metaball renderer can be added later (only if GoopBlob needs it).
- `@goopui/vue`: built with mkdist (ships `.vue` SFCs + `.d.ts`), works in plain Vue/Vite. Depends on reka-ui (real dependency), `@goopui/core`.
- `@goopui/nuxt`: separate package built with `@nuxt/module-builder`; auto-imports from `@goopui/vue` with a `prefix` option (default `Goop`) and injects `goop.css`.
- Styling: Tailwind v4 + shadcn CSS variables (`--primary`, `--radius`, ...). `@goopui/vue/goop.css` holds `@source` for our components, `--goop-*` tokens, and keyframes.
- Tuning: global `--goop-*` CSS vars, plus a few cva props per component (`goo="sm|md|lg"`, `drip`). The engine reads the numbers from CSS vars at mount.
- Layering: every component renders an `aria-hidden` goo layer (body shape + drip circles) with the filter applied, and the real content sits above it unfiltered. Goo color = the variant's bg token. Outline/ghost variants use a goo stroke layer.
- Reduced motion: static goo (shape and resting drips are kept), no drip sim, wobble, or pointer-follow; state changes are instant or a short fade.
- Browsers: last 2 versions of Chrome, Edge, Firefox, Safari, and iOS Safari. It must feel good in Safari; if a filter is too slow there, that component falls back to static goo.

## Component behavior

- GoopButton: hover spawns 1-3 drips off the bottom edge that swell, neck, and then either detach (fall about 24-40px, shrink, fade) or retract when the pointer leaves. Press squishes it with a spring rebound. Drips never affect layout (absolute overlay, `pointer-events: none`, padded filter region). Touch: squish plus one drip on tap; hover drips only for `(hover: hover)`.
- GoopPopover / GoopDropdown: on open, a goo bridge stretches from the trigger to the content and pinches off in about 250ms, then the filter turns off so content is crisp. Close shrinks toward the trigger, faster than open. No goo on menu items.

## v0.1 build order

GoopButton → GoopSpinner → GoopSwitch (reka Switch) → GoopPopover → GoopDropdown → GoopBlob/GoopBackground (perf stress test; drives the canvas decision).

The user reviews prototypes along the way. Feel matters most: get their sign-off on motion before polishing.

## Quality

- Vitest for core (filter generation, ref-counting, spring math, SSR import safety). Vitest + @vue/test-utils in happy-dom for components (props, variants, asChild, ARIA, reduced-motion path). Motion feel is judged by eye in the playground.
- Playground: real Tailwind v4 + shadcn-vue with the default theme. One page per component with the shadcn original side by side, plus reduced-motion and light/dark toggles.

## Workflow

One branch and PR per milestone step. React/Svelte stay private placeholders. CI, docs site, and registry come after v0.1.

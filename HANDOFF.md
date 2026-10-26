# goopUI plan (decisions locked 2026-10-25)

Repo: private `github.com/Tmmcmasters/goopui`. npm org `goopui` claimed. License MIT.

## Product

goopUI is a goopy mirror of the shadcn catalog. Each component is built on the same reka-ui primitive shadcn-vue uses, with the same API shape (cva variants, `class` passthrough, `asChild` via reka's `Primitive`). Distribution is npm packages for v0.x; keep components thin so a shadcn registry can be added later.

## Architecture

- `@goopui/core`: attach-style API on elements, e.g. `attachGoop(el, opts)` / `attachDrips(el, opts)` returning `{ update(opts), destroy() }`. SVG filter defs are injected once per document and ref-counted; no `document` access at import (SSR-safe). Drips use a tiny spring/gravity integrator on one shared rAF loop that sleeps when idle; interruptible; transform/opacity only; zero dependencies. Renderer is behind an interface so a canvas metaball renderer can be added later (only if GoopBlob needs it).
- `@goopui/vue`: built with mkdist (ships `.vue` SFCs + `.d.ts`), works in plain Vue/Vite (needs `@vitejs/plugin-vue`, which compiles the shipped SFCs). Depends on reka-ui, cn, class-variance-authority (real dependencies), `@goopui/core`. Plain Vue setup: `@import "@goopui/vue/goop.css";` in the Tailwind entry CSS, optional `app.use(GoopPlugin, { preset })` for app-wide engine defaults.
- `@goopui/nuxt`: separate package built with `@nuxt/module-builder`; auto-imports from `@goopui/vue` with a `prefix` option (default `Goop`; `prefix: 'X'` registers `GoopButton` as `<XButton>`), injects `goop.css`, appends `@source` to Tailwind entry CSS (`tailwindSource`, default on), and takes app-wide `preset` / `renderer` / `finish` / `splash` / `reducedMotion` defaults (`goop: { ... }` in nuxt.config).
- Props: every engine option is a component prop, derived from core in `packages/vue/src/goop-props.ts`: each tuning knob (`:drip-size`, `:softness`, ...), `preset`, `renderer`, `finish`, `splash`, feature toggles that take booleans (`:shockwave="false"`, `taffy`, `gloss`, `puddles`, `label-ride`, ...), the oil CSS-only vars, and a `goop` object as an escape hatch. Undefined props fall through to `--goop-*` CSS vars, then the preset. Precedence: app defaults < `goop` < props. Changes go through `handle.update()` (no remount). The handle is exposed (`shockwave`, `addGoop`, `drip`, `press`, `feedPointer`, `inspect`, ...).
- Styling: Tailwind v4 + shadcn CSS variables (`--primary`, `--radius`, ...). `@goopui/vue/goop.css` holds `@source` for our components, `--goop-*` tokens, and keyframes.
- Tuning: global `--goop-*` CSS vars, plus a few cva props per component (`goo="sm|md|lg"`, `drip`). The engine reads the numbers from CSS vars at mount.
- Layering: every component renders an `aria-hidden` goo layer (body shape + drip circles) with the filter applied, and the real content sits above it unfiltered. Goo color = the variant's bg token. The layer is created by core on mount only, so SSR markup is the plain shadcn component; after attach the host's own background goes transparent (inline style) and the goo body paints it. Content is wrapped in `[data-goop-label]` so it rides the body.
- Tinted variants (decided on vue-button; needs the user's eye in /button): the goo filter can't paint translucent color (low alpha vanishes under the edge threshold, high alpha goes opaque), so each variant sets an opaque `--goop-color` plus `--goop-opacity`, which goop.css applies to the whole goo layer after the filter. `bg-destructive/10` → destructive goo at 10% layer opacity (hover 20%, dark 20/30%), a true tint on any backdrop. Default/secondary: solid goo (their `/80` hovers become layer opacity 0.8). Outline: goo stroke: the body is `--border` (dark: `--input` at 15%), and an opaque inner fill (the shadcn bg, composited over `--background`) follows the body's pose via core `cssVars`, leaving a 1px gooey border that drips. Ghost: goo hidden at rest, fades in on hover/press/aria-expanded (`--goop-opacity` 0 → 1, dark 0.5). Link: no goo (`goo` prop can force it).
- Touch: GoopButton keeps native scrolling (no `touch-action` change), so taffy pull mostly works with a mouse/pen; add `touch-none` to a button to allow taffy on touch.
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

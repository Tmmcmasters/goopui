# goopUI handoff (updated 2026-10-28, end of session 4)

Repo: private `github.com/Tmmcmasters/goopui`, `main` at `873a00f` (PR #22). Nothing from session 4 is merged or pushed yet: it all sits on local branches (below). npm org `goopui` is claimed; nothing is published (all packages `private: true`). License MIT. `CLAUDE.md` covers layout, tooling, and gotchas; this note covers state, decisions, and what's next.

## Where things stand

| Area | State |
|---|---|
| `@goopui/core` | Goo engine + per-component modules (spinner, spinner-interact, switch, emerge, emerge-momentum, menu, tabs, tooltip, toast, slider, progress, checkbox/radio via goo-toggle) and shared helpers (`liquid.ts`, `splat.ts`). 288 tests on main (+1 per fix branch). |
| `@goopui/vue` | 13 components on main: Button, Spinner, Switch, Checkbox, RadioGroup, Popover, DropdownMenu, Tabs, Tooltip, Slider, Progress, Toaster (Sonner). 124 tests on main, 125 on `fix-checked-variants`. vue-sonner is a peer dep. |
| `@goopui/nuxt` | Auto-imports, `goop.css`, Tailwind `@source`, defaults. Serves `@goopui/core` unbundled and dedupes vue-sonner. |
| `apps/playground` | Compare page per component with props panels; `dev` clears `.nuxt`/Vite caches. |
| `apps/www` | Landing + docs. On branch `docs-components`: full pages for all 12 shipped components, refreshed getting-started + core API. Main still has only Button. |
| `apps/promo` | v7 montage (28s, 1080x1080) on branch `promo-v7`, now with the session 4 core fixes merged in. v8 render was started and STOPPED; no v8 file exists. `~/Desktop/goopui-x-promo-v7.mp4` is the last good render (has the bugs). |
| `brand/` | Pillow button, Slime `#1fa64a`, DynaPuff. |

## Session 4 branches (local only, not pushed, not merged)

| Branch | Commit | What |
|---|---|---|
| `fix-spinner-flash` | 6799a2e | Spinner paused its ticker when `document.visibilityState === 'hidden'`. Remotion renders in 5 tabs and background tabs report hidden while still painting, so promo frames froze/flashed. Gate removed (browsers already stop rAF in hidden tabs). Regression test. |
| `fix-dropdown-sides` | 084b2aa | Open/close slosh dome in `emerge-momentum.ts`: side circles were only center-clamped, so on menus taller than ~1.25x their width they bulged ~30px past the sides for ~0.75s (user's "stuck sides"). Circles now kept inside the panel width. Regression test. |
| `fix-checked-variants` | 236331d, b932923 | Class strings copied from newer shadcn targeted attributes reka-ui 2.11 never emits (`data-checked`, `data-unchecked`, `data-open`, `data-closed`, `data-active`, `data-horizontal/vertical`). Rewritten to `data-[state=...]` / `data-[orientation=...]` in switch, checkbox, radio, tabs, popover, tooltip, dropdown. Visible fixes: unchecked switch track was transparent; tabs content sat beside the list; overlay open/close animations never ran. Checkbox/radio "filled" classes now apply, so their checked look may have shifted: eyeball it. |
| `promo-v7` | d9c66eb | v7 montage + `42b8d06` dismissed-toast goo is slime (was cream) + `a659903` **core** toast fix (`toastFadeBody` now fully inflated by 40% opacity, `FADE_FULL = 0.4`; body lagged fading-in text, leaving text over dark bg with a thin sliver: matches the user's flash screenshot, but the flash was never reproduced, so unconfirmed) + merges of the spinner and dropdown fixes. The 20-24s "radio group" caption was checked and is accurate (radio clicks start ~22.46s). |
| `docs-components` | 74df388 | Merges three docs branches (`docs-spinner-switch-toggles`, `docs-overlays-tabs`, `docs-forms-toaster-intro`) + `fix-checked-variants`. Pages zero-padded `01.`-`13.` (Nuxt Content sorts names as strings). All 18 docs pages return 200; links checked. Adds `vue-sonner` to www deps (lockfile changed). |
| `popover-flow-morph` | daffe9f | **WIP, unfinished.** Agent was stopped mid-way while wiring the new option into `goop-props.ts`. Based on `fix-dropdown-sides`. Touches `emerge.ts`, `core/index.ts`, `emerge.test.ts`, popover/dropdown content SFCs, `goop-props.ts`, playground popover/dropdown pages. Not typechecked or tested. |

## Pick up here (2026-10-28)

1. **Finish the popover flow-out morph** (`popover-flow-morph` WIP). User-chosen behavior: the trigger stays put; goo bulges from the trigger edge facing the popover (follow reka `side`), stretches across the gap as a thick neck, swells into the popover body, then the neck pinches off with a wobble into the existing far-edge slosh/burst. Close reverses (sucked back into the trigger). Gooey and directional, not a linear tween; content fades in once the body is mostly formed. Must be a toggleable option with presets; ON by default for Popover; available on DropdownMenu but its default unchanged (ask the user). Reduced motion: no flow. Neck must meet the trigger edge whether or not the trigger has its own goo layer. Verify with an open/close frame strip and show the user.
2. **Merge to main** (full build/typecheck/test at merge): `fix-spinner-flash`, `fix-dropdown-sides`, `fix-checked-variants`, the toast core commit `a659903` (cherry-pick from `promo-v7`), `docs-components`, then the popover morph once approved. Expect overlap: `docs-components` already contains `fix-checked-variants`; `popover-flow-morph` sits on `fix-dropdown-sides`.
3. **Render promo v8** from `promo-v7` (`pnpm --filter @goopui/core build` then `pnpm --filter promo render:v7`, copy `apps/promo/out/goopui-x-promo-v7.mp4` to `~/Desktop/goopui-x-promo-v8.mp4`), ideally after the morph lands so the popover shows it. Open it for the user; ask them to confirm the toast flash is gone (ask for a timestamp if it isn't). Merge `promo-v7` on approval.
4. **User review of the docs site** (`docs-components`, www on :3001). Follow-ups the docs agents flagged: a shared generic props-table component (four hand-written `Goop*Props.vue` tables + markdown tables now); `DemoTabs.vue` has a `flex-col` workaround that the tabs variant fix may make unnecessary; `DemoDropdownMenu.vue` pads `pb-36` so the menu fits the preview; popover/tooltip `sides` demos unchecked for overflow; Radio demo's v-model readout sits beside the group; per-component reduced-motion wording in the accessibility page came from source comments, may need a consistency pass.
5. **Feel review by eye** (still nothing tuned live): spinner interaction, switch (ON wave bulges past the left wall for a couple of frames), popover, dropdown, tabs, tooltip, toast, slider, progress, checkbox, radio (re-check checkbox/radio after the variant fix).
6. Known gaps: Tabs `line` variant has no blob; tab blob overshoots ~10px past the list; secondary-trigger popovers are pale on white; spinner orbit variant with drips + 6 blobs has a drip-slot collision (drip jumps ~0.75x size; drips off by default); `data-inset` on DropdownMenu CheckboxItem/RadioItem never matches (no prop; harmless); Safari, canvas renderer, dark mode, RTL mostly unchecked; stock shadcn copies in `apps/playground/app/components/ui/*` have the same dead `data-*` variants (left alone on purpose).

Headless verification: a throwaway `playwright-core` in a temp dir with `executablePath` at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/...`. It hides scrollbars and always reports the tab visible (so it can't show hidden-tab bugs).

## Next steps (agreed order)

1. Popover morph, merges, promo v8 (above).
2. Feel review + tuning per component.
3. User sign-off on GoopButton tinted variants.
4. GoopBlob/GoopBackground; then candidates the user liked: Dialog/Sheet/Drawer, Accordion, Input focus ring.
5. Publish prep: CI (none yet; PRs have no checks), changesets, `0.1.0-alpha` of core/vue/nuxt (needs the user's npm login).
6. Optional: move the repo off the exFAT drive.

## Product decisions (locked)

- goopUI is a goopy mirror of the shadcn catalog. Each component wraps the same reka-ui primitive shadcn-vue uses, with the same API (cva variants, `class` passthrough, `asChild` via reka `Primitive`).
- Distribution: npm packages for v0.x; a shadcn-style registry may come later.
- Styling: Tailwind v4 + shadcn tokens. `@goopui/vue/goop.css` holds `--goop-*` defaults and keyframes.
- Every effect is individually toggleable and prop-driven, with presets `subtle | playful (default) | wild`. Precedence: option > CSS var > preset > default. In Vue, all props come from `packages/vue/src/goop-props.ts`, which is derived from core. A type guard fails typecheck when core adds an option the adapter doesn't handle.
- Layering: an `aria-hidden` goo layer sits behind real, unfiltered content. Goo color is the variant's bg token. Labels ride the body via `[data-goop-label]`.
- Tinted variants use opaque `--goop-color` plus `--goop-opacity` on the layer (goo can't paint translucent color).
- Reduced motion: static goo (shape kept), no sim, splash, shockwave, or drips.
- Renderers: SVG default for small components; canvas for oil finish (auto-upgrades), big surfaces, and dense pages. Software WebGL falls back to Canvas 2D.
- Browsers: last 2 versions of Chrome, Edge, Firefox, Safari, and iOS Safari. Safari has not been checked yet; it needs a real-device pass.

## Feel decisions from user feedback

- Goo must be strongly directional: momentum, inertia slosh, drips lean, and it flows toward the cursor.
- Fast pointer hits pass through: a small entry dent, a jelly wave across, then the far edge tears off varied droplets (big lead globs, mid drops, specks) along the hit direction (`hitEffect: 'shockwave'`, `--goop-hit-variety`). The old big splash glob is opt-in (`'splash'`).
- Click: a jelly squish/swell plus ripple and a near-field shockwave. Escape mode (goo flying across the page) is opt-in only.
- Reach and taffy are "globby", not stringy: several fat lumps reach for the cursor, and dragging pulls several lumpy ropes.
- Off by default: gloss (`gloss: true` → 0.6), puddles/fake floor, reach (`reach: true` → 80px), spinner drips.
- Momentum everywhere: popovers/menus slosh at the far edge and burst drops like a button hit along the whole edge; switch colors change only on impact, then flood as a wave.
- Goo surfaces take the trigger's color (popover/dropdown `surface: 'trigger'`); transparent triggers fall back to `--primary`. Tooltip keeps shadcn's inverted tokens. Oil sheen does NOT follow the mouse, and is light (intensity 0.3).
- Resting drips vary in size and position (seeded, `--goop-drip-variance`). The user dislikes static, unmoving drips in showcase contexts (removed from the promo).
- The website hero: fast swipes fire the click-style shockwave, not a glob.
- Popovers open by flowing OUT of the trigger edge (neck, swell, pinch-off), not by morphing on top of the trigger (session 4).

## User working preferences

- Ask decisions one at a time as multiple choice (AskUserQuestion), recommended option first.
- Spin up a fresh, narrowly briefed agent per task (a cheaper model for narrow fixes). Light verification while iterating; full build/typecheck/test only at merge. Short reports. Long-lived agents got expensive (one reached ~800k tokens).
- Show prototypes (open the page or video for them), then iterate on their feel feedback.

## Gotchas

- **shadcn class strings vs reka-ui 2.11:** newer shadcn targets `data-checked`/`data-open`/`data-horizontal`-style attributes; reka 2.11 only emits `data-state` and `data-orientation`. Use `data-[state=...]:` in new components and check reka's dist for what a part really emits.
- **Remotion hidden tabs:** renders run in several tabs; all but the foreground report `visibilityState === 'hidden'` while still painting. Never gate animation on visibility in core.
- **Nuxt Content ordering:** numeric filename prefixes sort as strings; zero-pad (`01.`) once a folder passes 9 pages.
- **Fresh worktrees** have no `node_modules`: `pnpm install --offline` (packages build in `prepare`).
- **exFAT drive:** macOS writes `._*` files everywhere. `pnpm clean:dot` deletes them. Nuxt/Nitro builds randomly fail with `ENOENT … chmod ._*.json` in `.output`/`.nuxt`; delete the app's `.output` and `.nuxt` and retry. Nuxt Content's SQLite can't live on exFAT (www keeps its DB in the OS temp dir; set `CONTENT_DB_DIR` for deploys).
- **Stale package builds in apps:** after rebuilding `packages/*`, the playground/www dev servers can keep serving the old build. `pnpm dev` in each app now deletes its `.nuxt`, `node_modules/.cache` and `node_modules/.vite` before starting, so restart the server after a package rebuild and hard-reload the browser. Component additions also need a restart because the Nuxt module reads the manifest at startup.
- **Typecheck after core renames:** run root `pnpm typecheck` before merging core changes. Round 4's renames broke www once.
- **mkdist:** if a public core option uses an unexported type, vue-tsc silently emits an empty SFC `.d.ts`. `packages/vue/build.mjs` now fails on that.
- **Parallel agents merging:** components built in separate worktrees collide in `core/src/index.ts`, `vue/src/manifest.ts`, `vue/src/index.ts`, `goop-props.ts` (keep both sides), and agents tend to extract the same shared helper twice; consolidate at merge. The `goop-props.ts` typecheck guards catch options a merged branch didn't wire through.
- **Killing dev servers:** they run as `node .../nuxt/bin/nuxt.mjs dev`, so `pkill -f "nuxt dev"` misses them; match `nuxt.mjs dev`.
- **Nuxt dev lock:** a stale lock from a killed server blocks restart; use `NUXT_IGNORE_LOCK=1`.
- **Headless checks:** Playwright's cached Chromium is at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/…`. A throwaway `playwright-core` install in the session scratchpad works with `executablePath` pointed there.

## Running at session end

- Nothing running: dev servers, the v8 render and all agents were stopped.
- Main checkout is on `docs-handoff-4` (this note). Worktrees under `.claude/worktrees/`: `agent-a83e3186aeda9048f` (promo-v7), `docs-merge` (docs-components), `agent-a6a528fbd61491f40` (popover-flow-morph WIP), `agent-adb79c0f5baa336ad` (fix-checked-variants), plus agent worktrees for the fix and docs branches and the older merged component branches. Remove merged ones with `git worktree remove` once their branches land.

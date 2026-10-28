# goopUI handoff (updated 2026-10-27, end of session 3)

Repo: private `github.com/Tmmcmasters/goopui`, `main` at `873a00f` (PR #22). npm org `goopui` is claimed; nothing is published yet (all packages `private: true`). License MIT. `CLAUDE.md` covers layout, tooling, and gotchas; this note covers state, decisions, and what's next.

## Where things stand

| Area | State |
|---|---|
| `@goopui/core` | Goo engine + per-component modules (spinner, spinner-interact, switch, emerge, emerge-momentum, menu, tabs, tooltip, toast, slider, progress, checkbox/radio via goo-toggle) and shared helpers (`liquid.ts`, `splat.ts`). 288 tests. |
| `@goopui/vue` | 13 components on main: Button, Spinner, Switch, Checkbox, RadioGroup, Popover, DropdownMenu, Tabs, Tooltip, Slider, Progress, Toaster (Sonner). 124 tests. vue-sonner is a peer dep. |
| `@goopui/nuxt` | Auto-imports, `goop.css`, Tailwind `@source`, defaults. Serves `@goopui/core` unbundled (stale browser-cached prebundles hid rebuilds) and dedupes vue-sonner. |
| `apps/playground` | Compare page per component with props panels; `dev` clears `.nuxt`/Vite caches; nav wraps. |
| `apps/www` | Landing + docs. No docs pages yet for the new components. |
| `apps/promo` | v7 montage (28s, 1080x1080) on branch `promo-v7` (cf93ebc, not merged/pushed), file `~/Desktop/goopui-x-promo-v7.mp4`. Render uses Chrome for Testing (default headless shell never runs rAF here; v6 render fails here too). |
| `brand/` | Pillow button, Slime `#1fa64a`, DynaPuff. |

## Pick up here (2026-10-27)

1. **Promo v7 review.** User has the video open. Possible notes: the 20-24s title reads "radio group" while slider/progress are on screen; dismissed-toast drips are pale cream on dark. Merge `promo-v7` once approved.
2. **Feel review by eye** (nothing tuned live yet): spinner interaction, switch (splat, droplets, color-on-impact wave; ON wave bulges past the left wall for a couple of frames, may be too much), popover (trigger-colored surface, far-edge burst knobs `openDripAmount/Size/Fling/Variety`), dropdown, tabs, tooltip, toast, slider, progress, checkbox, radio.
3. Known gaps: Tabs `line` variant has no blob; tab blob overshoots ~10px past the list; secondary-trigger popovers are pale on white (user may want primary); Safari, canvas renderer, dark mode and RTL mostly unchecked; no www docs for new components.

Fixed this session after user reports: dropdown scrollbar (highlight goo inside the scroll list), toast stack stutter on removal (goo snapped when sonner unmounted), switch off-wave ballooning past the track, invisible popover drops (white on white).

Headless verification: playwright-core in the session scratchpad drove `~/Library/Caches/ms-playwright/chromium_headless_shell-1243`; reinstall `playwright-core` in a temp dir to reuse. It hides scrollbars, so measure scrollHeight/clientHeight for overflow bugs.

## Next steps (agreed order)

1. Promo v7 feedback and merge.
2. Feel review + tuning per component (above).
3. User sign-off on GoopButton tinted variants.
4. GoopBlob/GoopBackground; then candidates the user liked: Dialog/Sheet/Drawer, Accordion, Input focus ring.
5. www docs pages for the new components.
6. Publish prep: CI (none yet; PRs have no checks), changesets, `0.1.0-alpha` of core/vue/nuxt (needs the user's npm login).
7. Optional: move the repo off the exFAT drive.

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

## User working preferences

- Ask decisions one at a time as multiple choice (AskUserQuestion), recommended option first.
- Spin up a fresh, narrowly briefed agent per task (a cheaper model for narrow fixes). Light verification while iterating; full build/typecheck/test only at merge. Short reports. Long-lived agents got expensive (one reached ~800k tokens).
- Show prototypes (open the page or video for them), then iterate on their feel feedback.

## Gotchas learned this session

- **exFAT drive:** macOS writes `._*` files everywhere. `pnpm clean:dot` deletes them. Nuxt/Nitro builds randomly fail with `ENOENT … chmod ._*.json` in `.output`/`.nuxt`; delete the app's `.output` and `.nuxt` and retry. Nuxt Content's SQLite can't live on exFAT (www keeps its DB in the OS temp dir; set `CONTENT_DB_DIR` for deploys).
- **Stale package builds in apps:** after rebuilding `packages/*`, the playground/www dev servers can keep serving the old build. `pnpm dev` in each app now deletes its `.nuxt`, `node_modules/.cache` and `node_modules/.vite` before starting, so restart the server after a package rebuild and hard-reload the browser. Component additions also need a restart because the Nuxt module reads the manifest at startup.
- **Typecheck after core renames:** run root `pnpm typecheck` before merging core changes. Round 4's renames broke www once.
- **mkdist:** if a public core option uses an unexported type, vue-tsc silently emits an empty SFC `.d.ts`. `packages/vue/build.mjs` now fails on that.
- **Parallel agents merging:** components built in separate worktrees collide in `core/src/index.ts`, `vue/src/manifest.ts`, `vue/src/index.ts`, `goop-props.ts` (keep both sides), and agents tend to extract the same shared helper twice; consolidate at merge. The `goop-props.ts` typecheck guards catch options a merged branch didn't wire through.
- **Killing dev servers:** they run as `node .../nuxt/bin/nuxt.mjs dev`, so `pkill -f "nuxt dev"` misses them; match `nuxt.mjs dev`.
- **Nuxt dev lock:** a stale lock from a killed server blocks restart; use `NUXT_IGNORE_LOCK=1`.
- **Headless checks:** Playwright's cached Chromium is at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/…`. A throwaway `playwright-core` install in the session scratchpad works with `executablePath` pointed there.

## Running at session end

- Playground on :3000 and website on :3001, both from the main checkout (on `docs-handoff-3`, same code as `main`).
- Finished agent worktrees under `.claude/worktrees/` (component branches are merged; `promo-v7` is the only unmerged one). Safe to remove the rest with `git worktree remove`.

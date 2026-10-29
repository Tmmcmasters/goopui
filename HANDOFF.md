# goopUI handoff (updated 2026-10-28, end of session 5)

Repo: private `github.com/Tmmcmasters/goopui`, `main` at `873a00f` (PR #22). Nothing from sessions 4 or 5 is merged or pushed: it all sits on local branches (below). npm org `goopui` is claimed; nothing is published (all packages `private: true`). License MIT. `CLAUDE.md` covers layout, tooling, and gotchas; this note covers state, decisions, and what's next.

**New this session:** a public coming-soon site is LIVE at https://goop.timmcmasters.work (Railway + Cloudflare), with a new logo (green lumpy splash puddle, live goo) and a new open animation for Popover/Dropdown/Tooltip ("bloom"). A 20s sneak-peek video for X is on the Desktop.

## Where things stand

| Area | State |
|---|---|
| `@goopui/core` | Goo engine + per-component modules. 290 tests on `integrate-s4`; 318 on `coming-soon` (includes bloom). |
| `@goopui/vue` | 13 components (Button, Spinner, Switch, Checkbox, RadioGroup, Popover, DropdownMenu, Tabs, Tooltip, Slider, Progress, Toaster). 125 tests. |
| `@goopui/nuxt` | Auto-imports, `goop.css`, Tailwind `@source`, defaults. |
| `apps/playground` | Compare page per component with props panels. |
| `apps/www` | Landing + docs. Full docs for all 12 components live on `docs-components` (merged into `integrate-s4`). Not deployed anywhere. |
| `apps/soon` | **NEW.** Coming-soon page (branch `coming-soon`): puddle logo, "Coming soon", "Components that drip.", four sneak-peek cards (Button, Switch, Slider, Tooltip). Static (`nuxt generate`). Deployed. |
| `apps/promo` | v7 montage on `promo-v7`. **NEW** `SneakPeek` composition on `promo-soon`. |
| `brand/` | **NEW logo: `brand/puddle/`** (on `puddle-logo`/`coming-soon`). Old Pillow button in `brand/button/`; rejected tap explorations in `brand/tap/` (`brand-tap`). |

## Deployment (NEW)

- **URL:** https://goop.timmcmasters.work. Railway project `goopUI` (id `a6c0c812-092a-4e2e-8467-5c25310d6c17`), service `coming-soon` (id `7e3ff492-d07b-4a4b-be89-e24febbb48e8`), env `production`. Served as a static site by Railpack (Caddy).
- **DNS:** Cloudflare zone `timmcmasters.work` (id `b80c1e1fd0ba74d04336f9937f2732cf`): proxied CNAME `goop` → `mhyevmjm.up.railway.app`, plus TXT `_railway-verify.goop`. The root domain and `www` point at another Railway app (the portfolio); don't touch them.
- **How to deploy (manual for now):** in the `soon` worktree (or any checkout of `coming-soon`), `pnpm --filter @goopui/core --filter @goopui/vue --filter @goopui/nuxt build`, `rm -rf apps/soon/.nuxt apps/soon/.output`, `pnpm --filter soon generate`. Copy `apps/soon/.output/public/.` into a folder linked to the Railway service (session 5 used a scratchpad folder; re-link with `railway link --project goopUI --service coming-soon`), delete `._*` files, then `railway up --service coming-soon --ci`. Confirm `railway deployment list --service coming-soon --json` shows SUCCESS. Purge Cloudflare cache for host `goop.timmcmasters.work` afterwards (the favicon stayed stale until purged).
- **Later:** once `coming-soon` is on GitHub, switch the service to deploy from the repo (root dir / build for `apps/soon`) so pushes auto-deploy.
- Railway CLI is logged in as the user; the Cloudflare MCP connector has access to the zone.

## Session 5 branches (local only, not pushed, not merged)

| Branch | Commit | What |
|---|---|---|
| `integrate-s4` | 98a4fa5 | All session-4 fixes merged onto `main` and fully verified (build 7/7, typecheck 11/11, core 290 + vue 125 tests): `fix-spinner-flash`, `fix-dropdown-sides`, `fix-checked-variants`, toast fix `a659903` (cherry-picked as a800f96), `docs-components`. No conflicts. Ready to become a PR to `main`. |
| `popover-flow-morph` | 94cd7e5 | Finished "neck" flow-out (bulge from trigger edge, neck, swell, pinch-off). **User rejected the look** (separate blob below the trigger; outline/ghost triggers show black goo). Kept as `flowStyle: 'neck'`. Base of the flow branches below. |
| `flow-pour` | 6836c3c | Prototype: trigger's whole edge pours down. **Rejected.** Keep for reference only. |
| `flow-drip` | 03ddbee | Prototype: drips run from the trigger and pool into the panel. **Rejected.** Keep for reference only. |
| `flow-bloom` | 18cbb74 | **APPROVED.** "Bloom": the panel blooms from its OWN centre (no link to the trigger), organic lobed spread, overshoot + wobble, then a big all-around splash; close shrinks back to centre (~0.3s). Props: `flowStyle: 'neck' \| 'bloom'` (default `'bloom'` on Popover, DropdownMenu, sub-menus, Tooltip), `bloomStart: 'single' \| 'merge'` (user wants both kept; default `'single'`). Tooltip: same bloom, lighter splash (few small drops). Splash drops are steered off the trigger rect; `closeSlosh` drives the bloom close wobble. Core 317 / vue 124 tests. |
| `puddle-logo` | 29d8cf1 | **APPROVED new logo.** See "Brand" below. Based on `coming-soon`. |
| `coming-soon` | 07f29e0 | `apps/soon` + merges of `flow-bloom` and `puddle-logo`. Based on `integrate-s4`. **This is what's deployed.** Core 318 / vue 125 tests, generate + typecheck pass. Also adds `dev:soon`/`generate:soon` root scripts and a turbo `generate` task. |
| `brand-tap` | 1dd103a | 4 "pressed Pillow button" logo variants + animated tap. **Rejected** in favour of the puddle. |
| `promo-soon` | a9795cb | Remotion `SneakPeek` (20s, 1080x1080, 30fps, no audio; `render:sneak`). Based on `promo-v7`, `coming-soon` merged in. Output `~/Desktop/goopui-sneak-peek-v2.mp4` (v1 kept alongside). |
| `docs-handoff-5` | (this note) | |

Branch graph: `main` ← `integrate-s4` ← `coming-soon` (← `flow-bloom` ← `popover-flow-morph` ← `fix-dropdown-sides`; ← `puddle-logo`) ← `promo-soon` (also ← `promo-v7`).

## Brand (changed this session)

- **Logo = a lumpy Slime `#1fa64a` splash puddle** (a soft blob with 2–4 lobes plus a lead droplet and a speck splashed off it) beside the DynaPuff "goopUI" wordmark (ink = currentColor). No black pillow, no drip.
- The static files are traced from the engine's own resting blob (`brand/tools/puddle.mjs` renders, `brand/tools/puddle.py` traces), so static and live match. `brand/puddle/`: `mark.svg`, `mark-mono.svg`, `favicon.svg` (body only, no droplets; reads at 16px), `lockup.svg`, `lockup-mono.svg`, `geometry.json`, gallery `index.html`; also `og.png` / `apple-touch-icon.png` in `apps/soon/public`.
- **Live logo** (`apps/soon/app/components/GoopLogo.vue`): `attachGoop` from `@goopui/core`, SVG renderer, six resting drips (four inside as lobes, two as satellites), goo softness 3, `dripLength` scales with size, softer click (`clickGoop` 0.15, `shockwave` 0.45), hover drips off. Static traced blob before hydration and under reduced motion. It reacts to the mouse like GoopButton; the user wants the logo live "across different sites" (www next).
- Emoji-grid versions of the logo for X posts were given in chat (full wordmark is 257 weighted chars; compact 5-row puddle mark is 64).

## Pick up here

1. **Merge to main via PRs** (full build/typecheck/test at merge): `integrate-s4` first, then `coming-soon` (brings bloom + logo + apps/soon), then `promo-soon`. Push, open PRs, get the user's OK before merging. Then switch Railway to deploy from GitHub.
2. **Put the live puddle logo on `apps/www`** (header, favicon, og) and the docs; update `brand/README.md` to make `brand/puddle` the primary mark.
3. **Bloom leftovers:** a single sharp lobe peak can show on the dropdown mid-spread; on the playground popover page splash drops can land on the neighbouring trigger. Document `flowStyle`/`bloomStart` on the www docs pages for Popover/Dropdown/Tooltip.
4. **Sneak-peek video:** user hasn't reviewed v2 yet. On the end card the logo poke flings one big glob off to the left; tone down if they want. Promo v8 (the old v7 montage re-render) is still pending; it should now show bloom.
5. **Coming-soon site:** the tooltip card does nothing on touch (hover/focus only); offer tap-to-open. Re-deploy whenever components are tuned.
6. Still pending from session 4: docs-site review by the user (`docs-components`), per-component feel review, known gaps (Tabs `line` variant has no blob, tab blob overshoot, pale secondary popovers, spinner orbit drip collision, Safari/canvas/dark/RTL unchecked).

## Next steps (agreed order)

1. Merges + GitHub deploy (above).
2. Feel review + tuning per component.
3. User sign-off on GoopButton tinted variants.
4. GoopBlob/GoopBackground; then candidates the user liked: Dialog/Sheet/Drawer, Accordion, Input focus ring.
5. Publish prep: CI (none yet), changesets, `0.1.0-alpha` of core/vue/nuxt (needs the user's npm login).
6. Optional: move the repo off the exFAT drive.

## Product decisions (locked)

- goopUI is a goopy mirror of the shadcn catalog. Each component wraps the same reka-ui primitive shadcn-vue uses, with the same API (cva variants, `class` passthrough, `asChild` via reka `Primitive`).
- Distribution: npm packages for v0.x; a shadcn-style registry may come later.
- Styling: Tailwind v4 + shadcn tokens. `@goopui/vue/goop.css` holds `--goop-*` defaults and keyframes.
- Every effect is individually toggleable and prop-driven, with presets `subtle | playful (default) | wild`. Precedence: option > CSS var > preset > default. In Vue, all props come from `packages/vue/src/goop-props.ts`, which is derived from core. A type guard fails typecheck when core adds an option the adapter doesn't handle. (Emerge/overlay options use their own `EmergeOptions` type and guard, not `GoopOptions`.)
- Layering: an `aria-hidden` goo layer sits behind real, unfiltered content. Goo color is the variant's bg token. Labels ride the body via `[data-goop-label]`.
- Tinted variants use opaque `--goop-color` plus `--goop-opacity` on the layer (goo can't paint translucent color).
- Reduced motion: static goo (shape kept), no sim, splash, shockwave, drips, or bloom.
- Renderers: SVG default for small components; canvas for oil finish (auto-upgrades), big surfaces, and dense pages. Software WebGL falls back to Canvas 2D.
- Browsers: last 2 versions of Chrome, Edge, Firefox, Safari, and iOS Safari. Safari has not been checked yet.

## Feel decisions from user feedback

- Goo must be strongly directional: momentum, inertia slosh, drips lean, and it flows toward the cursor.
- Fast pointer hits pass through: a small entry dent, a jelly wave across, then the far edge tears off varied droplets (big lead globs, mid drops, specks) (`hitEffect: 'shockwave'`, `--goop-hit-variety`). The old big splash glob is opt-in (`'splash'`).
- Click: a jelly squish/swell plus ripple and a near-field shockwave. Escape mode is opt-in only.
- Reach and taffy are "globby", not stringy.
- Off by default: gloss, puddles/fake floor, reach, spinner drips.
- **Overlays open with "bloom" (session 5):** Popover, DropdownMenu (and sub-menus) and Tooltip bloom from the panel's own centre in all directions, with a BIG all-around splash at full size (Tooltip: lighter splash because it opens on every hover). No goo travels from the trigger. The user rejected every trigger-attached style (neck, pour, drip & pool) because they never read as "coming out of the button", especially on outline/ghost triggers. Splash must not cover the trigger.
- Switch colors change only on impact, then flood as a wave.
- Goo surfaces take the trigger's color (popover/dropdown `surface: 'trigger'`); transparent triggers fall back to `--primary`. Tooltip keeps shadcn's inverted tokens. Oil sheen does NOT follow the mouse, and is light (intensity 0.3).
- Resting drips vary in size and position. The user dislikes static, unmoving drips in showcase contexts.
- The website hero: fast swipes fire the click-style shockwave, not a glob.
- Showcase/marketing components use the site's own colors (dark ink on the coming-soon page), green only on the logo and accents.

## User working preferences

- Ask decisions one at a time as multiple choice (AskUserQuestion), recommended option first. When the user can't name what they want, offer named concepts to pick from, then prototype 2+ side by side on separate playground ports.
- Spin up a fresh, narrowly briefed agent per task. Light verification while iterating; full build/typecheck/test only at merge. Short reports.
- Show prototypes (open the page or video for them), then iterate on their feel feedback.
- Before re-rendering videos, wait until all requested component/brand changes are done (user asked for this explicitly).

## Gotchas

- **Agents killing all dev servers:** one agent's restart killed every `nuxt.mjs dev` process (including other worktrees' servers). Tell agents to kill only the process on their own port (`lsof -ti tcp:<port> | xargs kill`).
- **Cloudflare cache:** after a Railway deploy, purge the `goop.timmcmasters.work` host or static assets (favicon) stay stale.
- **Static deploy upload:** `railway up` uploads the cwd. Deploy from a folder containing only `.output/public` (Railpack serves `index.html` with Caddy); strip `._*` files first.
- **Remotion beat flash:** the first frame of a beat replays zero animation steps, so anything faded in by a stepped/stateful animation shows at full opacity for one frame. Start each beat at its entry state (opacity 0).
- **shadcn class strings vs reka-ui 2.11:** newer shadcn targets `data-checked`/`data-open`/`data-horizontal`-style attributes; reka 2.11 only emits `data-state` and `data-orientation`. Use `data-[state=...]:`.
- **Remotion hidden tabs:** renders run in several tabs; all but the foreground report `visibilityState === 'hidden'` while still painting. Never gate animation on visibility in core.
- **Nuxt Content ordering:** numeric filename prefixes sort as strings; zero-pad (`01.`) once a folder passes 9 pages.
- **Fresh worktrees** have no `node_modules`: `pnpm install --offline` (packages build in `prepare`).
- **exFAT drive:** macOS writes `._*` files everywhere. `pnpm clean:dot` deletes them. Nuxt/Nitro builds randomly fail with `ENOENT … chmod ._*.json`; delete the app's `.output` and `.nuxt` and retry. Nuxt Content's SQLite can't live on exFAT (www keeps its DB in the OS temp dir; set `CONTENT_DB_DIR` for deploys).
- **Stale package builds in apps:** after rebuilding `packages/*`, restart the app's dev server and hard-reload. Component additions also need a restart (the Nuxt module reads the manifest at startup).
- **Typecheck after core renames:** run root `pnpm typecheck` before merging core changes.
- **mkdist:** if a public core option uses an unexported type, vue-tsc silently emits an empty SFC `.d.ts`. `packages/vue/build.mjs` fails on that.
- **Parallel agents merging:** components built in separate worktrees collide in `core/src/index.ts`, `vue/src/manifest.ts`, `vue/src/index.ts`, `goop-props.ts`; keep both sides.
- **Killing dev servers:** they run as `node .../nuxt/bin/nuxt.mjs dev`; `pkill -f "nuxt dev"` misses them. Prefer killing by port.
- **Nuxt dev lock:** a stale lock from a killed server blocks restart; use `NUXT_IGNORE_LOCK=1`.
- **Headless checks:** Playwright's cached Chromium is at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`. A throwaway `playwright-core` install in the session scratchpad works. Session 5's frame-strip script (`strip.mjs`: open/close strips of a playground overlay, env `PORT`, `NTH`, `OPENMS`) lived in the scratchpad and is gone; recreate if needed.

## Running at session end

- Dev servers still up: bloom playground on :3006 (`flow-bloom` worktree) and the soon app on :3010 (`puddle-logo` worktree). Kill by port when done.
- Main checkout is on `docs-handoff-5` (this note). Worktrees under `.claude/worktrees/`: `integrate-s4`, `soon` (coming-soon), `flow-bloom`, `puddle-logo`, `promo-soon`, `flow-pour`, `flow-drip`, `brand-tap`, `agent-a6a528fbd61491f40` (popover-flow-morph), plus all session-4 worktrees. Remove merged/rejected ones with `git worktree remove` once their branches land.

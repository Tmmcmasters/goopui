# goopUI handoff (updated 2026-10-25, end of session 2)

Repo: private `github.com/Tmmcmasters/goopui`, `main` at `1df1b75` (PR #20). npm org `goopui` is claimed; nothing is published yet (all packages `private: true`). License MIT. `CLAUDE.md` covers layout, tooling, and gotchas; this note covers state, decisions, and what's next.

## Where things stand

| Area | State |
|---|---|
| `@goopui/core` | Goo engine, feature-complete for v0.1. SVG + canvas (WebGL2, 2D fallback) renderers, presets, ~40 `--goop-*` vars described in `GOOP_VAR_META`, 127 tests. Demo: `pnpm --filter @goopui/core demo`. |
| `@goopui/vue` | GoopButton (merged, awaiting user sign-off) and GoopSpinner (merged, drips being tuned). mkdist build ships SFCs + `.d.ts`. 35 tests. |
| `@goopui/nuxt` | Module: auto-imports from `@goopui/vue/manifest` with `prefix` (default `Goop`), injects `goop.css`, adds Tailwind `@source`, app-wide engine defaults under `goop: {}`. |
| `apps/playground` | shadcn-vue vs goop compare pages: `/button`, `/spinner` (real), `/switch`, `/popover`, `/dropdown`, `/blob` (placeholders). |
| `apps/www` | Landing + docs (Nuxt Content, Lenis, DynaPuff headline, Pillow-button logo). Uses the real GoopButton. Var tables generated from `GOOP_VAR_META`. `pnpm dev:www` (port 3001). |
| `apps/promo` | Remotion X promo, deterministic (fake clock + replay per frame). `pnpm promo:render`. Latest cut v6 is on the user's Desktop (`~/Desktop/goopui-x-promo-v6.mp4`); not yet posted as far as we know. |
| `brand/` | Logo kit; chosen direction is `brand/button/` (Pillow button, Slime `#1fa64a`, DynaPuff wordmark). |

## Pick up here (2026-10-27)

All new work is on local branch `spinner-variants` (not pushed, no PR yet). It merges:
- GoopSpinner: 5 variants (`orbit|comet|ring|dots|pulse`), no-stall feel, and interaction on every variant via `packages/core/src/spinner-interact.ts`: slosh (any cursor movement), grab (drag pulls 4 fat lumps), pop (click squish + ripple). Props `interactive`/`slosh`/`grab`/`pop`; tuning in `SPINNER_INTERACT`. Drips now default OFF (user preferred interaction to drips).
- GoopSwitch (from `goop-switch`): goo thumb, effects `stretch`/`bridge`/`squish`/`fill`.
- GoopPopover (from `goop-popover`): panel emerges from the trigger via reusable `packages/core/src/emerge.ts` (`attachEmerge`, `emergeBridge`, `emergePose`, `EMERGE_FEEL`).
- `@goopui/nuxt` no longer pre-bundles `@goopui/core` (stale browser-cached deps hid rebuilt core).
- `reach` is opt-in now (default 0, `reach: true` = 80px). Wild preset still turns it on.
- Playground `dev` script clears `.nuxt` and Vite caches on start.

User feedback so far: loves the spinner variants. NOT yet reviewed by eye: spinner interaction feel, switch, popover.

In flight when paused: an agent building GoopDropdown on branch `goop-dropdown` (worktree under `.claude/worktrees/`), branched from `spinner-variants`, reusing emerge, plus a sliding goo highlight blob, submenus emerging from their row, and a select squish. Check `git log goop-dropdown`; if it finished, merge it into `spinner-variants`, rebuild, restart the playground.

## Next steps (agreed order)

1. User feel review: `/spinner` (interaction), `/switch`, `/popover`, then `/dropdown`; tune.
2. User sign-off on GoopButton at `/button` (tinted variants).
3. PR `spinner-variants` to main.
4. GoopBlob/GoopBackground.
5. Publish prep: CI, changesets, `0.1.0-alpha` of core/vue/nuxt (needs the user's npm login at the end).
6. Optional: move the repo off the exFAT drive to the internal APFS disk (see gotchas).

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
- Off by default: gloss (`gloss: true` → 0.6), puddles/fake floor, reach (`reach: true` → 80px). Oil sheen does NOT follow the mouse, and is light (intensity 0.3).
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
- **Nuxt dev lock:** a stale lock from a killed server blocks restart; use `NUXT_IGNORE_LOCK=1`.
- **Headless checks:** Playwright's cached Chromium is at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/…`. A throwaway `playwright-core` install in the session scratchpad works with `executablePath` pointed there.

## Running at session end

- Playground on :3000 (from `main`).
- Website on :3001 (from `main`).
- Core demo on :4174, served from the worktree `.claude/worktrees/agent-a3ef35ed76876ca1f` (detached at an older main). It's safe to stop it and remove that worktree, then run the demo from `main` instead.

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

## Open issue (pick up here)

**GoopSpinner drips aren't visible to the user.** PR #20 added drips that shed from the orbit and fall through the middle (`packages/core/src/spinner.ts`, `dripCircles`). The user reports not seeing them. Findings so far:
1. The playground was serving a stale prebuilt copy of the packages. Restarting didn't fix it; deleting `apps/playground/.nuxt` and the Vite/Nuxt caches did (the spinner went from 13 to 22 child elements). The user's browser may also need a hard reload (Cmd+Shift+R).
2. Even when working, the drips are too small to notice at default sizes. Radius is capped at `0.11 × size` (`rBase` in `dripCircles`), so at `size-4` (16px) a drop is about 1.5px and is mostly eaten by the goo filter. They're only visible at `size-12`, and even then they're small, off-center (shed angle varies ±0.45 rad from the top), and one sheds only every half turn.

Next fix: make drops clearly bigger (raise `rBase`; maybe 0.15–0.2), hang and stretch longer before detaching, fall from dead-center, and consider letting them fall a little below the box (adjust `setPadding` bottom). Then verify with a headless capture at size-4 and size-12 and get the user to hard-reload.

Also add a cache-clearing step to the playground dev script so package rebuilds always show up.

## Next steps (agreed order)

1. Fix spinner drip visibility (above), get the user's sign-off on GoopSpinner.
2. User sign-off on GoopButton at `/button`, especially the tinted variants (destructive 10% tint, outline drip-stroke, ghost hover-only goo).
3. Remaining v0.1 components: GoopSwitch (reka Switch) → GoopPopover → GoopDropdown → GoopBlob/GoopBackground.
4. Publish prep: CI, changesets, `0.1.0-alpha` of core/vue/nuxt (needs the user's npm login at the end).
5. Optional: move the repo off the exFAT drive to the internal APFS disk (see gotchas).

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
- Off by default: gloss (`gloss: true` → 0.6), puddles/fake floor. Oil sheen does NOT follow the mouse, and is light (intensity 0.3).
- Resting drips vary in size and position (seeded, `--goop-drip-variance`). The user dislikes static, unmoving drips in showcase contexts (removed from the promo).
- The website hero: fast swipes fire the click-style shockwave, not a glob.

## User working preferences

- Ask decisions one at a time as multiple choice (AskUserQuestion), recommended option first.
- Spin up a fresh, narrowly briefed agent per task (a cheaper model for narrow fixes). Light verification while iterating; full build/typecheck/test only at merge. Short reports. Long-lived agents got expensive (one reached ~800k tokens).
- Show prototypes (open the page or video for them), then iterate on their feel feedback.

## Gotchas learned this session

- **exFAT drive:** macOS writes `._*` files everywhere. `pnpm clean:dot` deletes them. Nuxt/Nitro builds randomly fail with `ENOENT … chmod ._*.json` in `.output`/`.nuxt`; delete the app's `.output` and `.nuxt` and retry. Nuxt Content's SQLite can't live on exFAT (www keeps its DB in the OS temp dir; set `CONTENT_DB_DIR` for deploys).
- **Stale package builds in apps:** after rebuilding `packages/*`, the playground/www dev servers can keep serving the old build. Stop the server, delete the app's `.nuxt` and `node_modules/.cache`, restart, and hard-reload the browser. Component additions also need a restart because the Nuxt module reads the manifest at startup.
- **Typecheck after core renames:** run root `pnpm typecheck` before merging core changes. Round 4's renames broke www once.
- **mkdist:** if a public core option uses an unexported type, vue-tsc silently emits an empty SFC `.d.ts`. `packages/vue/build.mjs` now fails on that.
- **Nuxt dev lock:** a stale lock from a killed server blocks restart; use `NUXT_IGNORE_LOCK=1`.
- **Headless checks:** Playwright's cached Chromium is at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/…`. A throwaway `playwright-core` install in the session scratchpad works with `executablePath` pointed there.

## Running at session end

- Playground on :3000 (from `main`).
- Website on :3001 (from `main`).
- Core demo on :4174, served from the worktree `.claude/worktrees/agent-a3ef35ed76876ca1f` (detached at an older main). It's safe to stop it and remove that worktree, then run the demo from `main` instead.

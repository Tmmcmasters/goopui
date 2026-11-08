# goopUI handoff (updated 2026-11-08, end of session 9)

Repo: **public** `github.com/Tmmcmasters/goopui`. `CLAUDE.md` covers layout, tooling and gotchas; this note covers state, decisions and what's next.

## Session 9 state (read this first; session 8 and older notes below are history)

**npm: published.** `@goopui/core`, `@goopui/vue`, `@goopui/nuxt` **0.1.0-alpha.0** are on npm (`latest`), tagged `@goopui/{core,vue,nuxt}@0.1.0-alpha.0` at `fe01878`. The user's npm account uses browser 2FA (no OTP codes): pnpm/npm can't publish from Claude's non-TTY shell. Flow that worked: Claude runs `pnpm pack` per package into a scratch dir; the user runs `npm publish ./goopui-<pkg>-<ver>.tgz --access public --tag latest --auth-type=web` in their own terminal, core → vue → nuxt; Claude verifies on the registry (new packages 404 for a few minutes) and pushes the tags. Check `npm whoami` first (the login expired once). Pending changesets → `0.1.0-alpha.1` for the next release (sound, release fixes, every component below). `@goopui/react` is still `private`.

**Live (`main` = `site-v1`, goop.timmcmasters.work), shipped this session:**
- #55–#59 (sound toggle, Combobox/Skeleton, menu bump, Sidebar #58, npm/yarn/bun support).
- #60 docs search: ⌘K / Ctrl+K / "/" palette (`components/search/*`), Nuxt Content search sections, Actions group. `GoopCommand` has no `shouldFilter`, so `search/Bridge.vue` re-shows items after the built-in filter: add a `shouldFilter`/`ignoreFilter` prop to GoopCommand and drop the bridge.
- #62 Sidebar motion (`travel`, `drawer`, `pour`); #63 GitHub star count (build-time module `apps/www/modules/github-stars.ts` + client refresh); #64 Menubar; #65 Pagination; #66 NavigationMenu (`openDrips` on by default); #67 gooier Skeleton + `GoopSkeletonReveal` (skeleton must copy the content's exact layout).
- #69 release fixes: typed cva variant props in apps (vue `build.mjs` fails on private `dist/` type imports); the Nuxt module no longer appends `@source` to goop.css.
- #70/#73 hydration: Caddy redirected `/docs/x` → `/docs/x/`, so every docs page hydrated a different route. Caddyfile now `try_files {path} {path}/index.html` and redirects `/x/` → `/x`. `pnpm check:hydration` (all pages × fresh/prefs/mobile; `BASE_URL=` for a live site, `--no-build`). **Cloudflare Email Obfuscation** also broke Input/Label (it rewrites example emails): a Configuration Rule now disables it for host `goop.timmcmasters.work` only (portfolio untouched). Live check: 0 mismatches; headless Chrome shows occasional `ERR_QUIC_PROTOCOL_ERROR` (network, not code).
- #71 Carousel (embla deps of `@goopui/vue`, in the nuxt `optimizeDeps` list); #74 Alert, Kbd, Breadcrumb, Button Group (a GoopButton inside a group drops its own goo unless `goo` is set), Empty. Docs pages 36–44.
- #72 **React foundation**: `@goopui/react` on **Radix**, a 1:1 mirror of shadcn/ui React; `'use client'` per file (post-build check), SSR of shadcn markup, goo attaches after hydration; `GoopProvider`; `ref` = DOM, `goopRef` = engine. Pilots: Button, Switch, Checkbox, Tabs, Dialog. Proven in Next.js 16 and Vite consumer apps. Docs: `/react/docs/...` shares the markdown (`::fw` blocks, `reactCode`/`reactTables` in entries), header Vue/React switch, React previews are real React islands; unported pages say "Vue only".

**User decisions (session 9):** React = Radix, single Next-ready package (no `@goopui/next`), path prefix `/react/docs`, real React islands, foundation + pilots then batches. **Update the Vue components' classes to current shadcn** so Vue and React look identical (not started). NumberField / Combobox / InputOTP in React follow shadcn/ui React (input-otp, cmdk + Popover, plain input + steppers). Next.js setup stays one `@import "@goopui/react/goop.css"` line.

**Next (in order):**
1. The user's phone feel feedback on Carousel (stretch + slosh + rubber band together?), NavigationMenu drips, Breadcrumb/Empty (faint on dark: `--muted` ≈ background), Sidebar pour bead.
2. Agents: Vue style refresh to current shadcn; React tab focus ring shows on click (Vue doesn't); React batch 1 (Skeleton, Badge, Card, Avatar, Separator, Label, Spinner). Later batches from #72's report: form controls; bloom overlays; menus; disclosure; bespoke (Drawer, Toaster, Command, Combobox, NumberField, InputOTP, Sidebar, PageTransition).
3. Railway: neither service's watch patterns include `packages/react` (a React-only change won't redeploy). Needs the user's OK (production config).
4. Remaining Vue components: Tags Input, Calendar (WIP `goop-calendar`), Range Calendar, Date Picker, Resizable / Scroll Area (WIP on `goop-catalog-ports`), Input Group, Table, Form/Field, Aspect Ratio, Chart, Item.
5. Then `0.1.0-alpha.1` (same publish flow), Dependabot #29–#31, Drawer/Accordion feel sign-off, `/nope` logs `[NUXT_E1005]` on the 404 page.

**Housekeeping:** 17 old agent worktrees removed (the user approved); their uncommitted work was saved as `wip(...)` commits on their branches (`a11y-audit`, `size-and-visual`, `goop-calendar`, `goop-catalog-ports`, `fix-command-highlight`, `fix-hydration`). Superseded: `wip-hydration`, `fix-hydration-2`, `fix-hydration`. This session's worktrees (`docs-search`, `github-stars`, `sidebar-motion`, `goop-*`, `skeleton-goo`, `react-foundation`, `*-s9`, `release`, `review`) are merged and can go (ask first). Disk: ~269 GB free after cleanup.

**Merging parallel branches (again):** shared files (`index.ts`, `goop-props.ts`, `goop.css`, `manifest.ts`, `ComponentTile.vue`, catalog) conflict every time. What worked: for files where the branch only appended, rebuild = ours + the branch's added lines (`git diff <merge-base> <branch> -- <file>`); otherwise keep both hunks and fix the shared `export {` / closing brace. Then build, typecheck, all tests and `check:hydration`, and fast-forward `site-v1` (GitHub marks the PRs merged). `pnpm build --concurrency=1` dodges most exFAT `._*` chmod races.

## Session 8 state (history)

**Live (`main`, goop.timmcmasters.work) and the preview (`site-v1`) are identical** as of PR #54 (`c212e72`). What shipped this session:
- #50 real previews for the 13 newer components on `/docs/components`; Radio Group and Input tiles centred (their roots are `w-full` like shadcn, so the tile passes `w-auto` / `container-class="w-auto"`). The slow core `emerge` splash test got a 120s timeout (it was ~33s on CI against 30s).
- #51 the site no longer runs the goo page transition. The `GoopPageTransition` component and its docs stay.
- #52 **opt-in sound via Cuelume** (`cuelume@^0.2.8`, an optional peer of core). Core: `enableSound`, `disableSound`, `setSoundEnabled`, `isSoundEnabled`, `requestSound`, `playCue`, `GOOP_SOUND_CUES`. Vue: a `sound` prop (inherited root → parts → app default), `provideGoopSound`, `GoopPlugin`/`provideGoopConfig({ sound })`. Nuxt: `goop.sound`. Docs page `1.getting-started/5.sound.md`.
- #53 the site turns sound on (`goop: { sound: true }`). The user listened locally and approved it.

**Open PRs into `site-v1`, all done and verified by their agents, NOT merged (the user hasn't said "merge it" yet):**
- #55 sound on/off toggle in the header (`SoundToggle.vue`, `useSoundPreference`, localStorage `goop-sound`; the boot script + `04.sound.client.ts` keep muted visitors silent). When muted, Cuelume still downloads but never plays.
- #56 Combobox trigger: the default chevron is Select's, with a 32px hit area. Skeleton shimmer is visible on dark (`--goop-shimmer-color`).
- #57 Command/menu highlight: no bump when crossing group headings/separators (`menuHighlightPose` scales the lag by item height / jump). Core test added.
- #58 Sidebar: the slosh shows on `inset`; an open sub-menu parent no longer gets a filled row. **Decision for the user:** this removes the open-parent fill on desktop too, not only mobile (a one-line change in `GoopSidebar.vue` if they want it mobile-only).
- #59 **package managers:** `vue-sonner` moves from peer to dependency of `@goopui/vue`. Without it, yarn 1 and 4 failed to build any app, because the main entry imports the Toaster. Adds `pnpm check:package-managers` (packs core/vue/nuxt and builds a Vite app with npm, pnpm, yarn 1, yarn 4, bun; all PASS), now part of RELEASING.md. The docs get pnpm/npm/yarn/bun tabs on every `pnpm add|up|dlx` block (`ProsePre.vue`, localStorage `goop-pm`).

A local branch `review-local` (worktree `.claude/worktrees/review`) has #55–#59 merged together with packages built; run `cd .claude/worktrees/review/apps/www && NUXT_IGNORE_LOCK=1 pnpm exec nuxt dev --port 3001` for the user to review them in one go.

**Unfinished:** the docs hydration-mismatch fix. Its agent was stopped mid-way; its uncommitted work (a `scripts/check-hydration.mjs` and small Caddyfile / nuxt.config / package.json edits, not reviewed) is on branch **`wip-hydration`**. Restart it from that branch or from scratch.

**npm (next step):** the user is logged in (`npm whoami` = tmmcmasters) and owns the **goopui** org; nothing is published yet. On `main`, build + typecheck pass and the tarballs are clean (no `workspace:*`, no `._*`). The core tests pass, but they can time out when the machine is busy; rerun them. **Publish only after #59 is on `main`**, otherwise yarn users can't build. Order: merge #55–#59 into `site-v1` → PR `site-v1` → `main` → on `main` follow RELEASING.md (dry run, `pnpm check:package-managers`, then **ask the user** before the real `pnpm publish -r --filter "./packages/*" --access public --tag latest`, then tag and push). Pending changesets (sound, vue-sonner, earlier ones) will feed `0.1.0-alpha.1`. The first publish is `0.1.0-alpha.0` as RELEASING.md says.

**Still open from session 7:** Safari check of the split transition (now moot for the site); Dependabot PRs #29–#31; the user hasn't signed off on the Drawer/Accordion feel.

**User feedback this session:** wants sounds and approved them; dislikes misaligned elements (check tile/preview centring when adding components); wants the library installable with npm, pnpm, yarn and bun (keep `check:package-managers` green); reviews locally when home, on the phone preview when away.

## Session 7 state (history)

**Live:** goop.timmcmasters.work now serves the real site (`apps/www`). PR #38 merged `site-v1` → `main`; Railway service `coming-soon` builds `apps/www/Dockerfile` from `main` (watch patterns for apps/www + packages); Cloudflare was purged. `apps/soon` is retired but still in the repo. PR #33 is superseded by #38: the user can close it (auto mode blocked me).

**Preview / staging:** Railway service `www` (production env) tracks branch **`site-v1`** at **https://www-production-7a37.up.railway.app**. The user works remotely and reviews on their phone. Flow: an agent's branch → PR into `site-v1` → the user says "merge it" → it's on the preview in ~2 min. **Railway PR environments are enabled but do not create previews for PRs into `site-v1`** (untested for PRs into `main`). When checking that a deploy is live, look for a marker unique to the new build (e.g. a string in a `/_nuxt/*.js` chunk); earlier I falsely reported "live" by matching text the old page also had.

**Merged into `site-v1` this session (on the preview, NOT on `main`/live yet):** #39 goo page transition (core `page-transition.ts`, `GoopPageTransition`, Nuxt `goop.pageTransition`), #40 bubbles + slower Slime band (~1150ms) + 200ms page fade. Everything before that (#34 input focus ring, #35–#37 landing, shader precision fix) is also on `main`.

**Landing:** dark, minimal, vue-bits-inspired. A full-bleed WebGL lava-lamp (`apps/www/app/components/landing/LavaLamp.vue`), the alpha pill, "Components that drip.", two CTAs, a meta line. No demo/inputs section (the user explicitly dislikes busy homepages). Dark is the site default. **Phone GPUs honour `mediump`**: shaders must use highp with a fallback and small units (the user's Android showed broken blobs until fixed).

**Launch clip:** `apps/promo/src/launch/` (`LaunchClip`, branch `promo-launch`, pushed, not merged). `pnpm --filter promo render:launch` uses `apps/promo/scripts/render.mjs` (Remotion Node API; the CLI times out on this machine) and now re-renders corrupt frames that Chrome occasionally returns at 3x scale. The X-ready encode was sent to the user. ffmpeg isn't installed: use Remotion's bundled one under `node_modules/.pnpm/@remotion+compositor-darwin-arm64@*/.../ffmpeg` with DYLD_LIBRARY_PATH set to its folder.

**npm:** see session 8 above (login and org are done).

### Session 7 results (all shipped to `main` and live, 2026-11-02)

All the agents finished; their work merged into `site-v1` and then `main` (PRs #41–#49). goop.timmcmasters.work and the preview are identical.
- #41 accordion drain away from the label; #43 menu highlight trails a low mound (no knob); #45 `textFollow`: label colour follows the goo edge.
- #44 page transition `split`: the new page above the band, the old page below (View Transitions, clone fallback).
- #46 docs-v2 (Customize panels from `apps/www/app/component-docs/entries/<slug>.ts`, see its README) + 13 new components: Command, Combobox, NumberField, InputOTP (built on reka PinInput, `string[]` model), HoverCard, ContextMenu, Skeleton, Badge, Card, Avatar, Separator, Label, Sidebar. **37 components.** Docs pages are numbered 23–35.
- #48 faster navigation: `@goopui/nuxt` turns off `navigationRepaint` in split mode, prefetch on interaction, a `warm-routes` plugin, and Caddy cache headers.
- #42 the launch clip source (`apps/promo/src/launch/`).

**Follow-ups noted by the agents:**
- **Command:** the highlight shows a small bump over group labels and separators (the same engine as #43, which only fixed vertical travel between items).
- **Index:** the new components have monogram tiles, not previews.
- **Combobox:** the ▾ trigger is tiny.
- **Skeleton:** the shimmer is very faint on dark.
- **Sidebar:** the slosh is invisible on the `inset` variant, and on mobile an open sub-menu row looks like the active pill.
- **Hydration:** the live site logs "Hydration completed but contains mismatches" on some docs pages (also on the existing Sheet page).
- **Band speed:** the ~1150ms band is now most of the navigation time; the user hasn't asked to change it.
- **Safari:** the split transition hasn't been checked in real Safari.
- **Dependencies:** InputOTP differs from shadcn's (no `vue-input-otp` dependency).

**Other open items:** remove the leftover old worktrees once the background cleanup has finished (merged; listed by `git worktree list` as non-locked agent folders); the Dependabot PRs #29–#31; the user hasn't yet given feel sign-off on the bubbles transition or on the Drawer/Accordion.

**User feedback this session:** wants previews on their phone for everything; dislikes busy pages; the transition must not be jarring (slower, no black flash, lighter band, no visible swap); the user approves merges explicitly ("merge it"), and auto mode blocks merges, production config changes and deletions without that.

**Housekeeping done:** 29 merged agent worktrees removed (the user approved).

## Pick up here (session 6 list; items 1–3 are done)

1. **Verify and merge the edge-clip fix.** Regression: on narrow screens, goo within ~50–80px of the right page edge gets cut off on screen (www landing: "Star on GitHub", full-width form buttons, the open Accordion row). Cause: the session-6 scroll fix (`packages/core/src/page-edge.ts`, `placeLayer` in `renderer.ts`, plus the canvas equivalent) put `overflow: clip` on the *filtered* goo layer, and Chromium cuts a filtered element's output at its own box. **Fix committed, unverified:** branch `fix-edge-clip` (from `site-v1`), commit `f07930c`. The filter moves to an inner box that keeps its full size, the unfiltered outer layer clips exactly at the page edge, and the clip margin is gone. It adds `scripts/check-edge-clip.mjs` (`pnpm check:edge-clip`, 390px). The agent was stopped before finishing its checks, so run core/vue typecheck + tests, `pnpm check:edge-clip` and `pnpm check:overflow` (~15 min; both must pass), screenshot the landing at 390px, then merge into `site-v1`. Its worktree is `.claude/worktrees/agent-a2ab288cd7c128a1c`.
2. **The user reviews the site locally**: `pnpm --filter www dev` (or `cd apps/www && NUXT_IGNORE_LOCK=1 pnpm exec nuxt dev --port 3001`) on `site-v1`, after building the packages. Iterate on their feedback.
3. **Go live, only after the user's OK** (in this order):
   - PR `site-v1` → `main` (it contains `integrate-s6`, so close or merge #33 with it). Note that merging packages to `main` redeploys whatever Railway serves.
   - Switch Railway service `coming-soon` to the www site: `dockerfilePath` → `apps/www/Dockerfile`, watch patterns → `apps/www/**` plus packages and lockfile (it currently uses `apps/soon/Dockerfile`). Use the Railway MCP `update-service` (the `railway environment edit --service-config` CLI reported "No changes to apply" and didn't work). Confirm the deployment reaches SUCCESS, then purge Cloudflare for host `goop.timmcmasters.work`.
   - npm: the user runs `! npm login`, then follow `RELEASING.md` (`pnpm publish -r --filter "./packages/*" --access public --tag latest`, after a `--dry-run`). Tag `@goopui/{core,vue,nuxt}@0.1.0-alpha.0` and push the tags.
4. The user hasn't given feel sign-off on the retimed Drawer motion or the Accordion flood; ask once the site is up.
5. Dependabot PRs #29–#31 (actions/checkout 7, setup-node 7, pnpm/action-setup 6) are open; merge them once CI passes.

## Where things stand

| Area | State |
|---|---|
| `@goopui/core` | Goo engine + per-component modules. ~458 tests on `site-v1`. New this session: `toggle.ts` (`attachToggleFill`), `drawer.ts` + `drawer-physics.ts` (our own drawer engine), `sheet.ts` (a thin wrapper over emerge), `input.ts`, `select.ts`, `accordion.ts`, `page-edge.ts`, `emergeMound` / `emergeBloomBulges`. |
| `@goopui/vue` | **23 components**: Button, Spinner, Switch, Checkbox, RadioGroup, Popover, DropdownMenu, Tabs, Tooltip, Slider, Progress, Toaster, plus new Dialog, AlertDialog, Sheet, Drawer, Accordion, Collapsible, Input, Textarea, Select, Toggle, ToggleGroup. ~199 tests. |
| npm | `site-v1` has core/vue/nuxt at **0.1.0-alpha.0**, `private` removed, `publishConfig.access public`, READMEs, `files` excluding `._*`. Changesets is in pre mode (`alpha`). `RELEASING.md` + `.github/workflows/release.yml` (manual dispatch, `NPM_TOKEN`, dry run by default). The tarballs were tested in throwaway Nuxt and Vue+Vite consumer apps. **Not published.** |
| `apps/www` | **The real site** (on `site-v1`): landing with the live puddle logo, "Work in progress · alpha" pill, hero CTAs and a bento showcase of live components with preset + reduced-motion switches; docs for all components (new ones badged "New · experimental"); npm install page. Static `nuxt generate` + `apps/www/Dockerfile` (Caddy). Not deployed. |
| `apps/soon` | Coming-soon page, **live** at https://goop.timmcmasters.work, auto-deployed by Railway from GitHub `main` (`apps/soon/Dockerfile`). It has the "Star on GitHub" link. To be replaced by www. |
| `apps/playground` | A compare page per component, including the new ones; `edge.vue` is the overflow test page. |
| `apps/promo`, `brand/` | Unchanged this session. The logo is `brand/puddle/`. |

## Branches

- `main`: everything through PR #32 (open-source setup, auto-deploy, GitHub link).
- `integrate-s6` (PR #33): the 7 component branches merged + feel fixes (Select close, Dialog fade overlay, ToggleGroup exits, Sheet edge bloom, Drawer rebuild + motion retime, Accordion flood, varied + soft bulges, highlight follows cursor, scroll-overflow fix).
- `site-v1`: `integrate-s6` + docs (`site-docs`) + landing (`site-landing`) + release prep (`release-alpha`) + www Dockerfile. Pushed.
- `fix-edge-clip`: one commit (`f07930c`), unverified (see Pick up here). No agents are running.
- Component/fix branches (`goop-*`, `fix-*`, `rework-*`, `rebuild-drawer`, `drawer-motion`, `soft-bulges`, `bloom-varied-bulge`, `highlight-follow-cursor`, `accordion-flood`, `fix-scroll-overflow`, `site-docs`, `site-landing`, `release-alpha`, `deploy-soon-github`, `oss-setup`, `soon-github-link`) are all merged into `integrate-s6`/`site-v1`/`main`, so they're safe to delete along with their worktrees under `.claude/worktrees/agent-*` (~10–18 GB of `node_modules` each on this exFAT drive; 146 GB free at session end). Rejected prototypes kept: `brand-tap`, `flow-pour`, `flow-drip`.

## Deployment

- Railway project `goopUI`, service `coming-soon`, env `production`. **Source: GitHub `Tmmcmasters/goopui`, branch `main`**, Dockerfile builder (`apps/soon/Dockerfile`: filtered pnpm install, `nuxt generate`, Caddy on `$PORT`), with watch patterns for `apps/soon/**`, the core/vue/nuxt packages, the lockfile, the workspace and root `package.json`, and `.dockerignore`. Pushes to `main` that touch those redeploy it.
- Cloudflare zone `timmcmasters.work`: proxied CNAME `goop` → Railway. Purge host `goop.timmcmasters.work` after each deploy (the Cloudflare MCP `purge_cache` with `hosts`).
- The root domain and `www` point at the user's portfolio; don't touch them.

## Product decisions (locked)

- goopUI is a goopy mirror of the shadcn catalog: each component wraps the same reka-ui primitive shadcn-vue uses, with the same API (cva variants, `class` passthrough, `asChild`). **Exception: Drawer is our own engine on reka Dialog with a vaul-compatible API (no vaul-vue).**
- Distribution: npm, starting with `0.1.0-alpha.0` on `latest` for core/vue/nuxt. React/Svelte stay private placeholders.
- Every effect is individually toggleable and prop-driven, with presets `subtle | playful (default) | wild`. Precedence: option > CSS var > preset > default. All Vue props come from `packages/vue/src/goop-props.ts` with typecheck guards.
- Layering: an `aria-hidden` goo layer behind real, unfiltered content. Reduced motion: static goo, no sim.
- Goo must never change the page's scroll size, and on-screen goo must never be clipped.
- The site replaces goop.timmcmasters.work and is honest that it's a work-in-progress alpha.

## Feel decisions from user feedback (session 6 additions)

- **Bulges are low, wide, gentle mounds** (`emergeMound`: raised-cosine, many overlapping circles, no kink), never sharp centred knobs. Each side varies per open (off-centre, sometimes two lumps, staggered timing; the `sloshVariety` knob). After the reshape the user said "That looks so much better."
- **Hover highlight bulge** (DropdownMenu, Select) sits under the cursor (`followPointer`) and is subtle (~1px on playful).
- **Dialog overlay:** plain shadcn fade by default; the goo pour is opt-in (`overlay: true`). The user disliked the grey pour.
- **Sheet:** blooms from the middle of its screen edge, overshoots, splashes, and shrinks back into the edge. No hanging or static drips.
- **Accordion/Collapsible:** a Toggle-style flood of the trigger row from the click point plus a jelly content spring. Two earlier versions (a drip/pour card, then a "splashy pour") were rejected as ugly or invisible.
- **Drawer:** the panel and goo are one body. Fast launch, small landing overshoot; close accelerates away. The edge slosh is driven by the panel's real braking.
- **Toggle** feel is approved ("great"). ToggleGroup exits drain smoothly; hover backgrounds don't hide the drain.
- Earlier decisions still stand: directional goo with momentum, bloom for overlays (no trigger-attached goo), the switch floods on impact, no static drips in showcases, showcase components use the site's ink colours with green only on the logo and accents.

## User working preferences

- Ask decisions one at a time as multiple choice (AskUserQuestion), recommended option first. The user likes being "grilled" before big work.
- Fresh, narrowly briefed agents per task, in their own worktree branched from the current integration branch, each on its own playground port. Light verification while iterating; full build/typecheck/test at each merge.
- **Nothing is published or deployed until the user has reviewed it locally.**
- Merging: auto mode blocks self-merging PRs unless the user explicitly says to merge (e.g. "merge it"). Ask rather than assume.
- Show prototypes, then iterate on feel feedback. Short reports.

## Gotchas (new this session; older ones still apply, see CLAUDE.md)

- **Disk:** each worktree's `node_modules` is ~10–18 GB on exFAT. The drive hit 0 bytes free with 35 worktrees; remove merged worktrees regularly (needs the user's OK).
- **Merging parallel component branches:** a union merge of `index.ts`/`goop-props.ts`/`goop.css` loses shared `export {` openers and closing `}`; git also interleaves function bodies that share tail lines. After each merge, check brace balance and run core + vue typecheck. Both emerge guard types needed `'detached' | 'bloomOrigin'`.
- **Vue tests import the built core:** rebuild core before running vue tests after core changes, or they fail confusingly.
- **Restart the playground after rebuilding packages**: it doesn't pick up new `dist` otherwise.
- **CI is slower than local:** avoid huge per-iteration `expect()` loops (the bloom splash sweep test now collects violations and asserts once).
- **Railway CLI** `environment edit --service-config` returned "No changes to apply"; use the Railway MCP `update-service` / `connect-service-source` instead.
- **playwright-core** is now a root dev dependency (`pnpm check:overflow`); it expects Chromium rev 1217, so set `CHROMIUM_PATH` to the cached `chromium_headless_shell-1243` binary.

## Running at session end

- `site-v1` is checked out in the main checkout. All agents are stopped and their dev servers killed. Still running: www (new site) :3001, playground :3006, coming-soon :3010 (`soon` worktree). Kill by port (`lsof -ti tcp:<port> | xargs kill`).

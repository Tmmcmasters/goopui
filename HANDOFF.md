# goopUI handoff (updated 2026-10-29, end of session 6)

Repo: **public** `github.com/Tmmcmasters/goopui` (MIT, open-source files + CI added this session). `main` is at the open-source setup + GitHub-link merges (PRs #23–#32). **Session 6's components, fixes and the real site are NOT on `main` yet**: they're on `integrate-s6` (PR #33, CI green, unmerged) and `site-v1` (built on top of it, not yet a PR). The user wanted to review the site locally before anything was published. `CLAUDE.md` covers layout, tooling and gotchas; this note covers state, decisions and what's next.

## Pick up here

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

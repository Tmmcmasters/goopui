# goopUI handoff (updated 2026-11-02, session 7 in progress)

Repo: **public** `github.com/Tmmcmasters/goopui`. `CLAUDE.md` covers layout, tooling and gotchas; this note covers state, decisions and what's next.

## Session 7 state (read this first; the session 6 notes below are history)

**Live:** goop.timmcmasters.work now serves the real site (`apps/www`). PR #38 merged `site-v1` → `main`; Railway service `coming-soon` builds `apps/www/Dockerfile` from `main` (watch patterns for apps/www + packages); Cloudflare was purged. `apps/soon` is retired but still in the repo. PR #33 is superseded by #38: the user can close it (auto mode blocked me).

**Preview / staging:** Railway service `www` (production env) tracks branch **`site-v1`** at **https://www-production-7a37.up.railway.app**. The user works remotely and reviews on their phone. Flow: an agent's branch → PR into `site-v1` → the user says "merge it" → it's on the preview in ~2 min. **Railway PR environments are enabled but do not create previews for PRs into `site-v1`** (untested for PRs into `main`). When checking that a deploy is live, look for a marker unique to the new build (e.g. a string in a `/_nuxt/*.js` chunk); earlier I falsely reported "live" by matching text the old page also had.

**Merged into `site-v1` this session (on the preview, NOT on `main`/live yet):** #39 goo page transition (core `page-transition.ts`, `GoopPageTransition`, Nuxt `goop.pageTransition`), #40 bubbles + slower Slime band (~1150ms) + 200ms page fade. Everything before that (#34 input focus ring, #35–#37 landing, shader precision fix) is also on `main`.

**Landing:** dark, minimal, vue-bits-inspired. A full-bleed WebGL lava-lamp (`apps/www/app/components/landing/LavaLamp.vue`), the alpha pill, "Components that drip.", two CTAs, a meta line. No demo/inputs section (the user explicitly dislikes busy homepages). Dark is the site default. **Phone GPUs honour `mediump`**: shaders must use highp with a fallback and small units (the user's Android showed broken blobs until fixed).

**Launch clip:** `apps/promo/src/launch/` (`LaunchClip`, branch `promo-launch`, pushed, not merged). `pnpm --filter promo render:launch` uses `apps/promo/scripts/render.mjs` (Remotion Node API; the CLI times out on this machine) and now re-renders corrupt frames that Chrome occasionally returns at 3x scale. The X-ready encode was sent to the user. ffmpeg isn't installed: use Remotion's bundled one under `node_modules/.pnpm/@remotion+compositor-darwin-arm64@*/.../ffmpeg` with DYLD_LIBRARY_PATH set to its folder.

**npm:** blocked on the user: `! npm login`, and create the npm org **goopui** (no `@goopui/*` packages exist yet). Then follow `RELEASING.md` (dry run first, ask before the real publish).

### Agents in flight (started 2026-11-02 ~14:15; the session may end before they report)

Each agent works in its own worktree under `.claude/worktrees/` on its own branch from `origin/site-v1` (6cb4ca9 or 43de10a), and is told to commit and push its branch, with no PR. **If the session ended, an agent may have been cut off mid-task.** To recover:
1. `git fetch origin`; if `origin/<branch>` exists, the agent finished and pushed. Review its screenshots (scratchpad paths below are session-temporary and may be gone; re-take them).
2. If it isn't on origin: `git -C .claude/worktrees/<folder> status` / `log`. Uncommitted or unpushed work may be there. Commit it to the branch, run the checks, then push.
3. If there's nothing useful, re-spawn a fresh agent from `origin/site-v1` with the brief below (each one also says: read CLAUDE.md + HANDOFF.md, reuse existing machinery, every effect toggleable via `goop-props.ts`, reduced motion = static, add core + vue tests, playground page, docs page badged "New · experimental", keep shared-file additions as appended blocks, verify with core/vue typecheck + tests + vue/nuxt build + `pnpm --filter www generate` + Playwright screenshots it actually looks at, then commit and push).

| Branch | Worktree folder | Pushed? | Brief |
|---|---|---|---|
| `fix-accordion-drain-blob` | agent-a63a52704f0f69182 | ✅ 1945469 | **Done.** A closing Accordion/Collapsible row drains away from its label (`drainAway` in `toggle.ts`); core 494 / vue 206 tests. Ready for a PR into `site-v1`. |
| `transition-split` | agent-a543973c53db94cf5 | not yet | The page-transition band is the seam: **new page above the goo, old page below**, never a visible swap. View Transitions API: snapshot the old page, clip `::view-transition-old(root)` per frame to the old side of the band, with the goo overlay as a live group on top. DOM-clone fallback; `split` option (default on with `band`); drop the whole-app fade in this mode so the header doesn't dim. |
| `fix-select-highlight-knob` | agent-a569f3556fb939fe1 | not yet | The Select/DropdownMenu hover highlight shows a sharp knob when the cursor moves **up** the list. Make the swell symmetric: wide, ~1px on playful. Add a test that sweeps up. |
| `fix-flood-text-colour` | agent-aecf82ce92c7ae4e6 | not yet | Branched from `fix-accordion-drain-blob`. Flood components (Toggle, ToggleGroup, Accordion, Collapsible) flip label colour all at once at the label centre. Instead, the colour should follow the goo edge, using an aria-hidden label copy in the on-goo colour clipped by the goo shape. `textFollow` option; falls back to the flip under reduced motion or without clip-path. |
| `docs-v2` | agent-a125eff75840b92f6 | not yet | vue-bits-style component docs: a Customize panel (sliders, switches, segmented controls, Reset) **generated from prop metadata** (from `goop-props.ts` + `manifest.ts`), Preview/Code tabs with live code and copy, a replay button, a props table, a `/docs/components` index grid (the landing "Browse components" button goes there), sidebar categories + filter, and the landing count derived from the manifest. Calm, not busy. |
| `goop-command` | agent-a1840301ba59eef17 | not yet | Command (full shadcn-vue set incl. CommandDialog) + Combobox. The highlight glides between items via keyboard and pointer (reuse Select/Dropdown); the dialog and popover bloom; the input gets the goo focus ring. |
| `goop-hovercard-contextmenu` | agent-a86b872a93e277f1e | not yet | HoverCard (blooms from the side nearest the trigger) + ContextMenu (the full set; **blooms from the right-click point**, gliding highlight, submenus bloom from their parent item). |
| `goop-numberfield-otp` | agent-a2c6ebf7336276650 | not yet | NumberField (+/- squish, goo focus ring, a directional nudge on change) + InputOTP (focus goo flows cell to cell as you type and back on delete, a pulse when a digit lands). |
| `goop-static-set` | agent-aa31ce9e0bff95103 | not yet | Skeleton (a slow, cheap goo shimmer instead of a pulse), Badge (tiny hover swell when interactive), Card (optional edge swell toward the pointer, off by default), Avatar (gooey settle on load), Separator, Label (plain ports). |
| `goop-sidebar` | agent-a0d4b147d27fc08e2 | not yet | The shadcn-vue **dashboard Sidebar**, full set (Provider, variants, collapsible offcanvas/icon, rail, inset, groups, menus, subs, `useSidebar`, cookie state, Cmd/Ctrl+B, mobile Sheet). Goo: gliding item highlight, an inner-edge slosh driven by collapse velocity, the mobile Sheet bloom, Collapsible flood for sub-menus, GoopTooltip in icon mode. Playground dashboard page. Run `check:overflow`. |
| `promo-launch` | (worktree removed) | ✅ bd40ffa | The launch clip source (done). Optional: a PR into `site-v1` so the source lands. |

**Merge plan:** open a PR into `site-v1` for each finished branch, and the user says "merge it". Merge fixes first, then `docs-v2`, then the components one at a time. The component branches all append to `packages/*/src/index.ts`, `goop-props.ts`, `manifest.ts`, `goop.css` and the docs nav, so after each merge check brace balance and run core + vue typecheck + tests (see Gotchas). Add the new components' Customize metadata once `docs-v2` is in. Then the user reviews on the preview; ship `site-v1` → `main` (and npm) only with their OK.

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

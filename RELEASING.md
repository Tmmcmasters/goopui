# Releasing

Published packages: `@goopui/core`, `@goopui/vue`, `@goopui/react`, `@goopui/nuxt`. They are versioned together (Changesets `fixed` group `@goopui/*`). `@goopui/svelte` stays `private` and is in the Changesets `ignore` list until it's ready.

`0.1.0-alpha.0` of core, vue and nuxt is on npm (`latest`). `@goopui/react` is first published with `0.1.0-alpha.1`.

The repo is in Changesets **pre mode** (`.changeset/pre.json`, tag `alpha`), so `changeset version` produces `0.1.0-alpha.N` versions.

## Publish order

Dependencies go first, so a package never points at a version that isn't on npm yet:

1. `@goopui/core` (no internal deps)
2. `@goopui/vue` (core)
3. `@goopui/react` (core)
4. `@goopui/nuxt` (core, vue)

`pnpm publish -r` sorts them the same way (topologically) and skips private packages.

## Cutting a version

```sh
pnpm changeset                 # describe the change (pick any @goopui/* package; they bump together)
pnpm changeset version         # -> 0.1.0-alpha.N for all four, updates changelogs
pnpm install                   # refresh the lockfile
git commit -am "chore: release 0.1.0-alpha.N" && git push
```

## Publishing (browser 2FA)

The npm account uses **browser 2FA** (no OTP codes), so `npm publish` can't finish from a non-interactive shell (an agent, or a script running without the owner). Three hands, in this order:

1. **Claude prepares the version**: `pnpm changeset version`, `pnpm install`, the checks below, the version commit, pushed to `main`.
2. **The owner runs `pnpm release:publish`** from their own terminal, on that `main`.
3. **Claude tags** the release with the commands `release:publish` prints at the end.

### 1. Checks (Claude, before the version commit is pushed)

From the repo root. On an exFAT drive clear AppleDouble files first (the `files` field also keeps them out of the tarballs).

```sh
pnpm install
pnpm clean:dot
pnpm build --concurrency=1
pnpm typecheck
pnpm test                       # core, vue, react (vitest)
pnpm check:exports              # publint + attw on the packed tarballs
pnpm check:package-managers     # npm, pnpm, yarn 1, yarn 4, bun x vue, react, react18, next, nuxt
APPS="vue-min react-min nuxt-min" pnpm check:package-managers npm pnpm   # lowest claimed peers
```

`check:package-managers` (the default apps) and `check:hydration` also run in CI on every push to `main`: if the CI run for this commit is green (`gh run list --branch main --workflow ci.yml`), the local `check:package-managers` run can be skipped; the `-min` run is local only.

What they cover:

- **`check:exports`** (`scripts/check-exports.sh`) packs the four packages and runs [publint](https://publint.dev) (`--strict`: `exports`, `main`, `types` and `files` agree and every path exists) and [`@arethetypeswrong/cli`](https://github.com/arethetypeswrong/arethetypeswrong.github.io) on each tarball. All four are **ESM-only by design** (`"type": "module"`, `import` conditions, no `require`), so attw runs with `--profile esm-only`: the `node16` (from ESM) and `bundler` resolutions must be clean; the CommonJS `require()` rows can't work for an ESM-only package and are ignored. `./goop.css` is excluded from attw (a stylesheet, not a module TypeScript resolves; publint still checks it exists).
- **`check:package-managers`** installs the tarballs into fresh apps with every package manager: Vite Vue (`vue-tsc` on typed usage), Vite React 19 and React 18 (smoke-tested in Chromium; React 18 is also type-checked against `@types/react` 18), Next.js 16 (`next build` type-checks typed usage, `next start` is smoke-tested) and Nuxt 4 with `modules: ['@goopui/nuxt']` and Tailwind v4 (`nuxt typecheck`, `nuxt build` with the SSR server smoke-tested, `nuxt generate`). The typecheck files carry `@ts-expect-error` / `@vue-expect-error` lines, so components whose shipped `.d.ts` degrade to `any` fail the check. The Vite apps also prove tree-shaking (GoopCommand, never imported, is not in the bundle) and that `goop.css` reaches the built CSS.
- **The `-min` apps** install the lowest versions the peer ranges claim: Vue 3.5.2 (3.5.0 and 3.5.1 run, but their types turn every goopUI component into `any`, so the peer is `^3.5.2`), React 18.0.0, Nuxt 3.13.0, Tailwind 4.0.0. Two package managers are enough: they test the peers, not the manager.

### 2. Publish (the owner)

```sh
git checkout main && git pull
pnpm install
npm whoami || npm login --auth-type=web     # the login expires
pnpm release:publish --dry-run              # optional: every step except the publish
pnpm release:publish
```

`pnpm release:publish` (`scripts/publish-release.sh`):

1. checks `npm whoami` (and prints the `npm login --auth-type=web` hint if it fails);
2. checks the tree is clean, on `main`, and equal to `origin/main`;
3. checks the four versions match and aren't on npm yet (`npm view`);
4. builds, packs fresh tarballs (no `workspace:`, no `._*` files) and runs `check:exports` on them;
5. publishes core → vue → react → nuxt with `--access public --tag latest --auth-type=web` (each opens a browser window), stopping at the first failure and saying what was and wasn't published. After fixing the cause, run it again: versions already on npm are skipped, so it carries on where it stopped;
6. polls `npm view` until each version is live (a never-published package can 404 for a few minutes);
7. prints the `git tag` / `git push` commands, without running them.

`--tag alpha` publishes under another dist-tag (keeps `latest` on an older build). `--dry-run` runs every step with `npm publish --dry-run` in place of the publish, and reports (instead of stopping at) a dirty tree, another branch or a missing login.

### 3. Tag (Claude)

Run what `release:publish` printed:

```sh
for p in core vue react nuxt; do git tag @goopui/$p@<ver>; done
git push origin @goopui/core@<ver> @goopui/vue@<ver> @goopui/react@<ver> @goopui/nuxt@<ver>
```

### By hand

If the script can't be used, the same steps:

```sh
OUT="$(mktemp -d)"
for p in core vue react nuxt; do (cd packages/$p && pnpm pack --pack-destination "$OUT"); done
bash scripts/check-exports.sh "$OUT"
npm publish "$OUT"/goopui-core-<ver>.tgz  --access public --tag latest --auth-type=web
npm publish "$OUT"/goopui-vue-<ver>.tgz   --access public --tag latest --auth-type=web
npm publish "$OUT"/goopui-react-<ver>.tgz --access public --tag latest --auth-type=web
npm publish "$OUT"/goopui-nuxt-<ver>.tgz  --access public --tag latest --auth-type=web
for p in core vue react nuxt; do npm view @goopui/$p dist-tags; done
```

Why not `pnpm changeset publish`? It needs a non-interactive login, and in pre mode it publishes a never-published package (React in `0.1.0-alpha.1`) under the `alpha` dist-tag, which then needs `npm dist-tag add @goopui/<pkg>@<ver> latest`.

Smoke tests after publishing:

- Nuxt: `npx nuxi init goop-test`, add Tailwind v4, `npx nuxi module add @goopui/nuxt`, render `<GoopButton>`.
- React: `npx create-next-app@latest goop-next` (Tailwind on), `npm install @goopui/react`, add `@import "@goopui/react/goop.css";` after `@import "tailwindcss";` in `app/globals.css`, render `<GoopButton>` from `app/page.tsx`.

## Leaving alpha

```sh
pnpm changeset pre exit
pnpm changeset version         # -> 0.1.0
```

## GitHub Actions

`.github/workflows/release.yml` runs on manual dispatch only (Actions -> Release -> Run workflow). It installs, builds, typechecks, tests, runs `pnpm check:package-managers` and then `pnpm publish -r` for the public packages (core, vue, react, nuxt, in dependency order) with npm provenance. Inputs: `tag` (dist-tag, default `latest`) and `dry_run` (default `true`).

Setup: create an npm **automation** (or granular, publish-enabled for `@goopui/*`) token and save it as the `NPM_TOKEN` repository secret. A token skips the browser 2FA, so this is the only way to publish without the owner at a terminal. The workflow publishes whatever versions are committed, so run `changeset version` and push first.

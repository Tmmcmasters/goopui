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

The npm account uses **browser 2FA** (no OTP codes), so `pnpm publish` / `npm publish` can't finish from a non-interactive shell (an agent, or a script). The flow: pack the tarballs (pnpm rewrites `workspace:*` to real versions while packing), check them, then the owner publishes each tarball from their own terminal.

Run from the repo root on an up-to-date `main` with a clean tree, after the version commit:

```sh
# 1. Fresh build and checks. On an exFAT drive, clear AppleDouble files first
#    (the `files` field also excludes them from the tarballs).
pnpm install
pnpm clean:dot
pnpm build --concurrency=1
pnpm typecheck
pnpm turbo run test --filter=./packages/core --filter=./packages/vue --filter=./packages/react --filter=./packages/nuxt
# check:package-managers (npm, pnpm, yarn 1, yarn 4, bun x Vite Vue, Vite React, Next.js 16)
# and check:hydration run in CI: confirm the CI run for this commit is green
# (`gh run list --branch main --workflow ci.yml`) instead of running them here.

# 2. Pack each package into a scratch dir and inspect the tarballs.
OUT="$(mktemp -d)"
for p in core vue react nuxt; do (cd packages/$p && pnpm pack --pack-destination "$OUT"); done
ls "$OUT"
for t in "$OUT"/*.tgz; do tar -xOzf "$t" package/package.json | grep -n workspace: && echo "BAD: $t"; done
for t in "$OUT"/*.tgz; do tar tzf "$t" | grep -E '(^|/)\._|\.map$' && echo "BAD: $t"; done

# 3. The owner publishes, in this order, from their own terminal (each opens a browser
#    window). Check the login first: it expires.
npm whoami
npm publish "$OUT"/goopui-core-<ver>.tgz  --access public --tag latest --auth-type=web
npm publish "$OUT"/goopui-vue-<ver>.tgz   --access public --tag latest --auth-type=web
npm publish "$OUT"/goopui-react-<ver>.tgz --access public --tag latest --auth-type=web
npm publish "$OUT"/goopui-nuxt-<ver>.tgz  --access public --tag latest --auth-type=web

# 4. Verify (a package that has never been published can 404 for a few minutes)
for p in core vue react nuxt; do npm view @goopui/$p dist-tags; done
npm view @goopui/react@<ver> dependencies      # real versions, no workspace:*
npm view @goopui/nuxt@<ver> dependencies

# 5. Tag and push (Changesets tag format)
for p in core vue react nuxt; do git tag @goopui/$p@<ver>; done
git push origin main --tags
```

Use `--tag alpha` instead of `--tag latest` to keep `latest` on an older build.

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

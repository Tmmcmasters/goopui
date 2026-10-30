# Releasing

Published packages: `@goopui/core`, `@goopui/vue`, `@goopui/nuxt`. They are versioned together (Changesets `fixed` group). `@goopui/react` and `@goopui/svelte` stay `private` and are in the Changesets `ignore` list until they're ready.

The repo is in Changesets **pre mode** (`.changeset/pre.json`, tag `alpha`), so `changeset version` produces `0.1.0-alpha.N` versions.

## First publish: 0.1.0-alpha.0 on `latest`

The versions are already bumped to `0.1.0-alpha.0` (changelogs written). Run from the repo root on an up-to-date `main` with a clean tree:

```sh
# 1. Log in (once per machine). Check the account owns or can create the @goopui scope.
npm login
npm whoami

# 2. Fresh build, checks, and a dry run. On an exFAT drive, clear AppleDouble files first
#    (the `files` field also excludes them from the tarballs).
pnpm install
pnpm clean:dot
pnpm turbo run build typecheck test --filter=./packages/core --filter=./packages/vue --filter=./packages/nuxt
pnpm publish -r --filter "./packages/*" --access public --tag latest --dry-run

# 3. Publish. pnpm rewrites `workspace:*` to 0.1.0-alpha.0 and skips private packages.
#    With npm 2FA on, add --otp=<code>.
pnpm publish -r --filter "./packages/*" --access public --tag latest

# 4. Verify
npm view @goopui/core dist-tags
npm view @goopui/vue dist-tags
npm view @goopui/nuxt dist-tags
npm view @goopui/nuxt@0.1.0-alpha.0 dependencies   # real versions, no workspace:*

# 5. Tag and push (Changesets tag format)
git tag @goopui/core@0.1.0-alpha.0
git tag @goopui/vue@0.1.0-alpha.0
git tag @goopui/nuxt@0.1.0-alpha.0
git push origin main --tags
```

Why not `pnpm changeset publish`? In pre mode it publishes a never-published package under the `alpha` dist-tag. That works too, followed by `npm dist-tag add @goopui/<pkg>@0.1.0-alpha.0 latest` for each package, but publishing with `--tag latest` directly is one step.

Smoke test after publishing: `npx nuxi init goop-test`, add Tailwind v4, `npx nuxi module add @goopui/nuxt`, render `<GoopButton>`.

## Later alphas

```sh
pnpm changeset                 # describe the change (pick core/vue/nuxt; they bump together)
pnpm changeset version         # -> 0.1.0-alpha.1, updates changelogs
pnpm install                   # refresh the lockfile
git commit -am "chore: release 0.1.0-alpha.1" && git push
```

Then publish locally as above (with `--tag latest`, or `--tag alpha` to keep `latest` on an older build), or run the **Release** GitHub Actions workflow.

## Leaving alpha

```sh
pnpm changeset pre exit
pnpm changeset version         # -> 0.1.0
```

## GitHub Actions

`.github/workflows/release.yml` runs on manual dispatch only (Actions -> Release -> Run workflow). It installs, builds, typechecks, tests and runs `pnpm publish -r` for the public packages with npm provenance. Inputs: `tag` (dist-tag, default `latest`) and `dry_run` (default `true`).

Setup: create an npm **automation** (or granular, publish-enabled for `@goopui/*`) token and save it as the `NPM_TOKEN` repository secret. The workflow publishes whatever versions are committed, so run `changeset version` and push first.

#!/usr/bin/env bash
# One-command publish of @goopui/{core,vue,react,nuxt} from the owner's terminal (browser 2FA:
# every `npm publish` opens a browser window). See RELEASING.md.
#
#   pnpm release:publish              publish the committed version
#   pnpm release:publish --dry-run    every step except the publish (npm publish --dry-run)
#   pnpm release:publish --tag alpha  another dist-tag (default: latest)
#
# Steps: npm login -> clean `main`, up to date with origin -> the four versions match and aren't
# on npm yet -> fresh build + pack -> scripts/check-exports.sh on the tarballs -> publish core,
# vue, react, nuxt in dependency order, stopping at the first failure -> wait until npm serves
# each version -> print the git tag commands (they're not run).
#
# Re-running after a partial publish resumes: packages already on npm at this version are
# skipped, as long as they're a prefix of the publish order (core, then vue, ...).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
PKGS=(core vue react nuxt)
DRY=0
TAG=latest
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --tag) TAG="${2:?--tag needs a value}"; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1"; exit 2 ;;
  esac
  shift
done

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nSTOP: %s\n' "$*" >&2; exit 1; }
# A precondition: fatal for a real publish, reported (and counted) in a dry run.
blocked=0
need() { # $1 = message
  if [ $DRY = 1 ]; then printf '  WOULD STOP a real publish: %s\n' "$1"; blocked=$((blocked + 1))
  else die "$1"; fi
}
[ $DRY = 1 ] && echo "DRY RUN: nothing will be published."

# ---- 1. npm login -------------------------------------------------------------------------------
say "npm login"
if user="$(npm whoami 2>/dev/null)"; then
  echo "  logged in as $user"
else
  echo "  not logged in to npm (or the login expired). Run:"
  echo "    npm login --auth-type=web"
  need "npm whoami failed"
fi

# ---- 2. git -------------------------------------------------------------------------------------
say "git"
branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" = main ] && echo "  on main" || need "on branch '$branch', not main"
if [ -n "$(git status --porcelain)" ]; then
  git status --short | sed 's/^/    /'
  need "the working tree is not clean"
else
  echo "  working tree clean"
fi
if git fetch -q origin main 2>/dev/null; then
  if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then echo "  HEAD = origin/main"
  else need "HEAD ($(git rev-parse --short HEAD)) is not origin/main ($(git rev-parse --short origin/main)): pull or push first"; fi
else
  need "could not fetch origin"
fi

# ---- 3. versions --------------------------------------------------------------------------------
say "versions"
VER=''
for p in "${PKGS[@]}"; do
  v="$(node -p "require('./packages/$p/package.json').version")"
  private="$(node -p "!!require('./packages/$p/package.json').private")"
  printf '  @goopui/%-6s %s\n' "$p" "$v"
  [ "$private" = true ] && die "@goopui/$p is private"
  [ -z "$VER" ] && VER="$v"
  [ "$v" = "$VER" ] || die "versions differ (@goopui/$p is $v, core is $VER). Run \`pnpm changeset version\`."
done

# Which are on npm already? `npm view` prints nothing (E404) for a version that isn't.
on_npm() { [ "$(npm view "@goopui/$1@$VER" version 2>/dev/null)" = "$VER" ]; }
TODO=()
done_prefix=1
for p in "${PKGS[@]}"; do
  if on_npm "$p"; then
    [ $done_prefix = 1 ] || die "@goopui/$p@$VER is on npm but an earlier package isn't: publish by hand, in order"
    echo "  @goopui/$p@$VER is already on npm: skipping (resuming an earlier run)"
  else
    done_prefix=0
    TODO+=("$p")
  fi
done
[ ${#TODO[@]} -gt 0 ] || die "all four packages are already on npm at $VER. Bump with \`pnpm changeset version\` first."
echo "  to publish: ${TODO[*]} (tag: $TAG)"

# ---- 4. build, pack, check ----------------------------------------------------------------------
say "build"
pnpm clean:dot >/dev/null 2>&1
pnpm turbo run build --concurrency=1 --filter=@goopui/core --filter=@goopui/vue --filter=@goopui/react --filter=@goopui/nuxt \
  > /dev/null 2>&1 || die "build failed: run \`pnpm build --concurrency=1\` to see why"
echo "  built"

say "pack"
OUT="$(mktemp -d "${TMPDIR:-/tmp}/goop-release.XXXXXX")"
for p in "${PKGS[@]}"; do
  (cd "packages/$p" && pnpm pack --pack-destination "$OUT" >/dev/null) || die "pnpm pack failed for @goopui/$p"
  t="$OUT/goopui-$p-$VER.tgz"
  [ -f "$t" ] || die "expected $t"
  tar -xOzf "$t" package/package.json | grep -q '"workspace:' && die "$(basename "$t") still has workspace: in package.json"
  tar -tzf "$t" | grep -qE '(^|/)\._' && die "$(basename "$t") contains AppleDouble ._* files (pnpm clean:dot)"
  echo "  $(basename "$t")  $(du -h "$t" | cut -f1)"
done

say "check:exports (publint + attw)"
bash scripts/check-exports.sh "$OUT" > "$OUT/check-exports.log" 2>&1 || { cat "$OUT/check-exports.log"; die "check:exports failed"; }
sed -n '/^Summary:/,$p' "$OUT/check-exports.log"

# ---- 5. publish ---------------------------------------------------------------------------------
PUBLISHED=()
say "publish ($([ $DRY = 1 ] && echo 'npm publish --dry-run' || echo "each opens a browser window for 2FA"))"
for p in "${TODO[@]}"; do
  t="$OUT/goopui-$p-$VER.tgz"
  echo "  npm publish $(basename "$t") --access public --tag $TAG --auth-type=web"
  if [ $DRY = 1 ]; then
    npm publish "$t" --access public --tag "$TAG" --dry-run > "$OUT/publish-$p.log" 2>&1 \
      || { cat "$OUT/publish-$p.log"; die "npm publish --dry-run failed for @goopui/$p"; }
    echo "    ok (dry run)"
    continue
  fi
  if npm publish "$t" --access public --tag "$TAG" --auth-type=web; then
    PUBLISHED+=("$p")
  else
    echo
    echo "FAILED publishing @goopui/$p@$VER."
    echo "  published in this run: ${PUBLISHED[*]:-(none)}"
    left=(); hit=0
    for q in "${TODO[@]}"; do [ "$q" = "$p" ] && hit=1; [ $hit = 1 ] && left+=("$q"); done
    echo "  NOT published:         ${left[*]}"
    echo "Fix the cause (npm login --auth-type=web if the login expired) and re-run"
    echo "\`pnpm release:publish\`: it skips what's already on npm and carries on from @goopui/$p."
    exit 1
  fi
done

# ---- 6. wait for npm ----------------------------------------------------------------------------
say "waiting for npm to serve $VER"
if [ $DRY = 1 ]; then
  echo "  (dry run: would poll \`npm view @goopui/<pkg>@$VER version\` for ${TODO[*]})"
else
  for p in "${PUBLISHED[@]}"; do
    # A never-published package (React's first release) can 404 for a few minutes.
    for i in $(seq 1 60); do
      on_npm "$p" && { echo "  @goopui/$p@$VER is live"; continue 2; }
      sleep 10
    done
    echo "  @goopui/$p@$VER still isn't visible after 10 minutes; check \`npm view @goopui/$p@$VER\` later"
  done
  for p in "${PKGS[@]}"; do printf '  @goopui/%-6s %s\n' "$p" "$(npm view "@goopui/$p" dist-tags --json 2>/dev/null | tr -d '\n ')"; done
fi

# ---- 7. tags ------------------------------------------------------------------------------------
say "next: tag the release (not run; Claude or you run these)"
for p in "${PKGS[@]}"; do echo "  git tag @goopui/$p@$VER"; done
echo "  git push origin $(for p in "${PKGS[@]}"; do printf '@goopui/%s@%s ' "$p" "$VER"; done)"

rm -rf "$OUT"
if [ $DRY = 1 ]; then
  echo
  if [ $blocked -gt 0 ]; then echo "DRY RUN done: every step ran; $blocked precondition(s) above would stop a real publish."
  else echo "DRY RUN done: every step passed. \`pnpm release:publish\` would publish ${TODO[*]} at $VER."; fi
fi

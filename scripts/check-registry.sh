#!/usr/bin/env bash
# End-to-end check of the shadcn registries (scripts/build-registry.mjs): builds them into a
# temp dir, serves them on localhost, and installs every component into fresh apps with the
# real CLIs, the way a user would:
#   react  `shadcn init` (Next.js, Radix) + `shadcn add <url>...`, `next build`, smoke
#   vue    `shadcn-vue init` (Vite) + `shadcn-vue add <url>...`, `vue-tsc -b && vite build`, smoke
#   nuxt   `shadcn-vue init` (Nuxt, shadcn-nuxt) + add, `nuxt generate`, smoke
# react and vue also add one item through the documented `@goopui` namespace and `list` the
# registry.json index.
# Every item is added (not a sample), then a page using Button, Dialog, Select, Drawer, Tabs,
# Sidebar and Command (scripts/registry-fixtures/) is built and loaded in headless Chromium:
# no console errors, the goo attaches, a dialog opens. Nothing is edited by hand after `add`.
#
# @goopui/core comes from a tarball of packages/core (the registry is built with
# --core-spec file:<tgz>), since the version the items pin may not be on npm yet.
#
# Usage: pnpm check:registry [react] [vue] [nuxt]     (default: all three)
# Env: TMPDIR (apps go in a temp dir under it; each is deleted once it passes, a failing one
#      is kept with its logs), KEEP=1 keeps them all, CHROMIUM_PATH (smoke browser),
#      SHADCN / SHADCN_VUE (CLI specs, default shadcn@latest / shadcn-vue@latest),
#      REGISTRY_PORT (3044), APP_PORT (3045).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/goop-registry.XXXXXX")" && pwd -P)"
TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(react vue nuxt)
SHADCN="${SHADCN:-shadcn@latest}"
SHADCN_VUE="${SHADCN_VUE:-shadcn-vue@latest}"
REGISTRY_PORT="${REGISTRY_PORT:-3044}"
APP_PORT="${APP_PORT:-3045}"
KEEP="${KEEP:-0}"
FIX="$ROOT/scripts/registry-fixtures"
export NEXT_TELEMETRY_DISABLED=1 NUXT_TELEMETRY_DISABLED=1 CI=1
echo "work dir: $WORK"

pids=()
cleanup() {
  for p in "${pids[@]}"; do kill "$p" 2>/dev/null; done
  if [ "$KEEP" != 1 ] && [ -z "$(ls -A "$WORK/apps" 2>/dev/null)" ]; then rm -rf "$WORK"; fi
}
trap cleanup EXIT

# 1. Core tarball + registry built against it, served on localhost.
mkdir -p "$WORK/tgz" "$WORK/apps"
(cd "$ROOT/packages/core" && pnpm pack --pack-destination "$WORK/tgz" >/dev/null) || { echo "FAIL  pack @goopui/core"; exit 1; }
CORE="$(ls "$WORK"/tgz/goopui-core-*.tgz)"
BASE="http://localhost:$REGISTRY_PORT/r"
node "$ROOT/scripts/build-registry.mjs" --out "$WORK/srv/r" --base-url "$BASE" --core-spec "file:$CORE" || { echo "FAIL  build-registry"; exit 1; }
node "$ROOT/scripts/serve-static.mjs" "$WORK/srv" "$REGISTRY_PORT" > "$WORK/registry-server.log" 2>&1 &
pids+=($!)
for _ in $(seq 1 50); do curl -sf "$BASE/react/registry.json" >/dev/null && break; sleep 0.2; done
curl -sf "$BASE/react/registry.json" >/dev/null || { echo "FAIL  registry server"; cat "$WORK/registry-server.log"; exit 1; }

# Every component item of a framework's registry, as URLs.
urls() { node -e "
  const r = require(process.argv[1]);
  console.log(r.items.filter((i) => i.type === 'registry:ui').map((i) => process.argv[2] + '/' + i.name + '.json').join(' '))
" "$WORK/srv/r/$1/registry.json" "$BASE/$1"; }

# The documented @goopui namespace (components.json `registries`) and `list <registry.json>`.
# $1 = app dir, $2 = CLI spec, $3 = framework.
namespace() {
  node -e "
    const fs = require('fs'); const f = process.argv[1] + '/components.json';
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    c.registries = { ...c.registries, '@goopui': process.argv[2] + '/{name}.json' };
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
  " "$1" "$BASE/$3" || return 1
  (cd "$1" && npx -y "$2" add -y -o @goopui/spinner < /dev/null > namespace.log 2>&1) || { echo "add @goopui/spinner failed (namespace.log)"; return 1; }
  (cd "$1" && npx -y "$2" list "$BASE/$3/registry.json" < /dev/null > list.log 2>&1) || { echo "list registry.json failed (list.log)"; return 1; }
  grep -q 'goop-lib' "$1/list.log" || { echo "list shows no goop-lib (list.log)"; return 1; }
}

# Serves a built app ($2 = command) on APP_PORT and smoke-tests it. $1 = app dir.
smoke() {
  local dir="$1" cmd="$2" pid ok=0
  (cd "$dir" && exec bash -c "$cmd" > serve.log 2>&1) &
  pid=$!
  pids+=($pid)
  (cd "$ROOT" && EXPECT='[data-goop-active]' node scripts/smoke-page.mjs "http://localhost:$APP_PORT/" 'Hello goo' 'Open dialog' > "$dir/smoke.log" 2>&1) || ok=1
  pkill -P "$pid" 2>/dev/null
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  return $ok
}

run_react() {
  local dir="$WORK/apps/next-app"
  (cd "$WORK/apps" && npx -y "$SHADCN" init -t next -b radix -p nova -n next-app -y --no-monorepo < /dev/null > "$WORK/apps/react-init.log" 2>&1) || { echo "shadcn init failed"; return 1; }
  mv "$WORK/apps/react-init.log" "$dir/init.log"
  # shellcheck disable=SC2046
  (cd "$dir" && npx -y "$SHADCN" add -y $(urls react) < /dev/null > add.log 2>&1) || { echo "shadcn add failed"; return 1; }
  namespace "$dir" "$SHADCN" react || return 1
  cp "$FIX/react-page.tsx" "$dir/app/page.tsx"
  (cd "$dir" && npx next build > build.log 2>&1) || { echo "next build failed"; return 1; }
  smoke "$dir" "exec npx next start -p $APP_PORT" || { echo "smoke test failed"; return 1; }
}

run_vue() {
  local dir="$WORK/apps/vue-app"
  (cd "$WORK/apps" && npx -y "$SHADCN_VUE" init -t vite -p nova -n vue-app -y < /dev/null > "$WORK/apps/vue-init.log" 2>&1) || { echo "shadcn-vue init failed"; return 1; }
  mv "$WORK/apps/vue-init.log" "$dir/init.log"
  # shellcheck disable=SC2046
  (cd "$dir" && npx -y "$SHADCN_VUE" add -y $(urls vue) < /dev/null > add.log 2>&1) || { echo "shadcn-vue add failed"; return 1; }
  namespace "$dir" "$SHADCN_VUE" vue || return 1
  cp "$FIX/vue-app.vue" "$dir/src/App.vue"
  (cd "$dir" && npm run build > build.log 2>&1) || { echo "build failed"; return 1; }
  smoke "$dir" "exec npx vite preview --port $APP_PORT --strictPort" || { echo "smoke test failed"; return 1; }
}

run_nuxt() {
  local dir="$WORK/apps/nuxt-app"
  (cd "$WORK/apps" && npx -y "$SHADCN_VUE" init -t nuxt -p nova -n nuxt-app -y < /dev/null > "$WORK/apps/nuxt-init.log" 2>&1) || { echo "shadcn-vue init (nuxt) failed"; return 1; }
  mv "$WORK/apps/nuxt-init.log" "$dir/init.log"
  # shellcheck disable=SC2046
  (cd "$dir" && npx -y "$SHADCN_VUE" add -y $(urls vue) < /dev/null > add.log 2>&1) || { echo "shadcn-vue add failed"; return 1; }
  local app="$dir/app/app.vue"
  [ -d "$dir/app" ] || app="$dir/app.vue"
  cp "$FIX/vue-app.vue" "$app"
  (cd "$dir" && npx nuxt generate > build.log 2>&1) || { echo "nuxt generate failed"; return 1; }
  smoke "$dir" "exec node '$ROOT/scripts/serve-static.mjs' .output/public $APP_PORT" || { echo "smoke test failed"; return 1; }
}

fail=0
summary=()
for t in "${TARGETS[@]}"; do
  echo "== $t"
  start=$SECONDS
  reason="$("run_$t" 2>&1 | tail -1)"
  dir="$WORK/apps/$([ "$t" = react ] && echo next || echo "$t")-app"
  if [ -z "$reason" ]; then
    summary+=("PASS  $t ($((SECONDS - start))s)")
    [ "$KEEP" = 1 ] || rm -rf "$dir"
  else
    summary+=("FAIL  $t: $reason  (logs: $dir/{init,add,namespace,list,build,serve,smoke}.log)")
    fail=1
    for f in add build smoke; do
      [ -f "$dir/$f.log" ] && grep -iE 'error|failed|cannot|could not' "$dir/$f.log" | grep -v EBADENGINE | head -15
    done
  fi
done

printf '%s\n' "${summary[@]}"
exit $fail

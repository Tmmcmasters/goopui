#!/usr/bin/env bash
# Packs @goopui/{core,vue,nuxt} and installs them into a fresh Vite + Vue + Tailwind v4 app
# with npm, pnpm, yarn 1, yarn 4 and bun, then builds each app. Catches what only shows up
# for consumers: workspace:* left in a manifest, peers a manager won't auto-install (yarn),
# missing files in the tarball. Run after `pnpm build`: `pnpm check:package-managers`.
# Managers that aren't installed run through npx. Pass names to run a subset: `... npm yarn`.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/goop-pm.XXXXXX")"
TGZ="$WORK/tgz"
mkdir -p "$TGZ"
MANAGERS=("$@")
[ ${#MANAGERS[@]} -eq 0 ] && MANAGERS=(npm pnpm yarn1 yarn4 bun)

for p in core vue nuxt; do
  (cd "$ROOT/packages/$p" && pnpm pack --pack-destination "$TGZ" >/dev/null) || { echo "pack failed: $p"; exit 1; }
done
CORE="$(ls "$TGZ"/goopui-core-*.tgz)"
VUE="$(ls "$TGZ"/goopui-vue-*.tgz)"

make_app() {
  local dir="$1"
  mkdir -p "$dir/src"
  cat > "$dir/index.html" <<'EOF'
<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>
EOF
  cat > "$dir/src/main.ts" <<'EOF'
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
createApp(App).mount('#app')
EOF
  cat > "$dir/src/App.vue" <<'EOF'
<script setup lang="ts">
import { GoopButton, GoopSwitch } from '@goopui/vue'
</script>
<template><GoopButton>Hello goo</GoopButton><GoopSwitch /></template>
EOF
  printf '@import "tailwindcss";\n@import "@goopui/vue/goop.css";\n' > "$dir/src/style.css"
  cat > "$dir/vite.config.ts" <<'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [vue(), tailwindcss()] })
EOF
  # vue-sonner is deliberately NOT listed: the app doesn't use the Toaster.
  # The unpublished core is pinned to its tarball with each manager's override field.
  cat > "$dir/package.json" <<EOF
{
  "name": "goop-pm-check",
  "private": true,
  "type": "module",
  "dependencies": { "vue": "^3.5.0", "tailwindcss": "^4.0.0", "@goopui/vue": "file:$VUE" },
  "devDependencies": { "vite": "^7.0.0", "@vitejs/plugin-vue": "^6.0.0", "@tailwindcss/vite": "^4.0.0" },
  "overrides": { "@goopui/core": "file:$CORE" },
  "resolutions": { "@goopui/core": "file:$CORE" }
}
EOF
  printf 'overrides:\n  "@goopui/core": "file:%s"\n' "$CORE" > "$dir/pnpm-workspace.yaml"
}

has() { command -v "$1" >/dev/null 2>&1; }
fail=0
for m in "${MANAGERS[@]}"; do
  dir="$WORK/$m"
  make_app "$dir"
  case "$m" in
    npm)   cmd=(npm install --no-audit --no-fund) ;;
    pnpm)  cmd=(pnpm install) ;;
    yarn1) cmd=(npx -y yarn@1.22.22 install --non-interactive --cache-folder "$dir/.yarn-cache") ;;
    yarn4) touch "$dir/yarn.lock"; printf 'nodeLinker: node-modules\nenableGlobalCache: false\n' > "$dir/.yarnrc.yml"
           cmd=(npx -y @yarnpkg/cli-dist@4 install) ;;
    bun)   if has bun; then cmd=(bun install); else cmd=(npx -y bun@1 install); fi ;;
    *) echo "unknown manager: $m"; fail=1; continue ;;
  esac
  [ "$m" = pnpm ] || mv "$dir/pnpm-workspace.yaml" "$dir/pnpm-workspace.yaml.skip"
  (cd "$dir" && "${cmd[@]}" > install.log 2>&1)  # pnpm exits 1 on ignored tool builds; the build decides
  if (cd "$dir" && npx --no-install vite build > build.log 2>&1) && grep -q 'Hello goo' "$dir"/dist/assets/*.js; then
    echo "PASS  $m"
  else
    echo "FAIL  $m  (logs: $dir/install.log, $dir/build.log)"
    grep -iE 'error|could not resolve' "$dir/build.log" | head -3
    fail=1
  fi
done

[ $fail -eq 0 ] && rm -rf "$WORK"
exit $fail

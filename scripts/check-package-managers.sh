#!/usr/bin/env bash
# Packs @goopui/{core,vue,react,nuxt} and, with each of npm, pnpm, yarn 1, yarn 4 and bun,
# installs the tarballs into three fresh consumer apps and builds them:
#   vue    Vite + Vue + Tailwind v4 (GoopButton, GoopSwitch)
#   react  Vite + React + Tailwind v4 (Button, Tabs, Dialog, Sidebar, Carousel), then served
#          and smoke-tested
#   next   Next.js 16 App Router + Tailwind v4: a Server Component page renders Button, Tabs,
#          Dialog, Sidebar and Carousel (embla; checked in the prerendered HTML) inside a
#          GoopPageTransition layout, `next build` type-checks against the shipped .d.mts, then
#          `next start` is smoke-tested (hydration, dialog opens, a <Link> navigates through
#          the page transition)
# Catches what only shows up for consumers: workspace:* left in a manifest, peers a manager
# won't auto-install (yarn), missing files in the tarball, a dropped 'use client'.
# Run after `pnpm build`: `pnpm check:package-managers`. Managers that aren't installed run
# through npx. Pass names to run a subset: `... npm yarn4`; APPS="react next" limits the apps.
# The smoke test uses headless Chromium (playwright-core; CHROMIUM_PATH to pick a binary);
# SMOKE=0 skips it. Apps live under the OS temp dir; a passing app is deleted right away
# (disk), a failing one is kept with its logs.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Physical path (macOS $TMPDIR is a /var -> /private/var symlink): Turbopack's root check
# compares it against the real cwd.
WORK="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/goop-pm.XXXXXX")" && pwd -P)"
TGZ="$WORK/tgz"
mkdir -p "$TGZ"
MANAGERS=("$@")
[ ${#MANAGERS[@]} -eq 0 ] && MANAGERS=(npm pnpm yarn1 yarn4 bun)
read -r -a APP_LIST <<< "${APPS:-vue react next}"
SMOKE="${SMOKE:-1}"
PORT=4317
export NEXT_TELEMETRY_DISABLED=1

for p in core vue react nuxt; do
  (cd "$ROOT/packages/$p" && pnpm pack --pack-destination "$TGZ" >/dev/null) || { echo "pack failed: $p"; exit 1; }
done
CORE="$(ls "$TGZ"/goopui-core-*.tgz)"
VUE="$(ls "$TGZ"/goopui-vue-*.tgz)"
REACT="$(ls "$TGZ"/goopui-react-*.tgz)"

fail=0
for t in "$TGZ"/*.tgz; do
  if tar -xOzf "$t" package/package.json | grep -q '"workspace:'; then
    echo "FAIL  $(basename "$t") has workspace: in its package.json"; fail=1
  fi
  if tar -tzf "$t" | grep -qE '(^|/)\._'; then
    echo "FAIL  $(basename "$t") contains AppleDouble ._* files"; fail=1
  fi
done

# package.json for an app. $2 = dependencies, $3 = devDependencies (JSON object bodies).
# The local core is pinned to its tarball with each manager's override field (the adapters'
# manifests say 0.1.0-alpha.N, which may not be on npm yet).
write_pkg() {
  cat > "$1/package.json" <<EOF
{
  "name": "goop-pm-check",
  "private": true,
  "type": "module",
  "dependencies": { $2 },
  "devDependencies": { $3 },
  "overrides": { "@goopui/core": "file:$CORE" },
  "resolutions": { "@goopui/core": "file:$CORE" }
}
EOF
  printf 'overrides:\n  "@goopui/core": "file:%s"\n' "$CORE" > "$1/pnpm-workspace.yaml"
}

make_vue() {
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
  # vue-sonner is deliberately NOT listed: it's a dependency of @goopui/vue.
  write_pkg "$dir" \
    "\"vue\": \"^3.5.0\", \"tailwindcss\": \"^4.0.0\", \"@goopui/vue\": \"file:$VUE\"" \
    '"vite": "^7.0.0", "@vitejs/plugin-vue": "^6.0.0", "@tailwindcss/vite": "^4.0.0"'
}

# The same components in both React apps. Server-safe: no hooks, no handlers.
react_demo() {
  cat <<'EOF'
import {
  GoopButton,
  GoopCarousel, GoopCarouselContent, GoopCarouselDots, GoopCarouselItem, GoopCarouselNext, GoopCarouselPrevious,
  GoopSidebar, GoopSidebarContent, GoopSidebarInset, GoopSidebarMenu, GoopSidebarMenuButton, GoopSidebarMenuItem,
  GoopSidebarProvider, GoopSidebarRail, GoopSidebarTrigger,
  GoopDialog, GoopDialogContent, GoopDialogDescription, GoopDialogHeader, GoopDialogTitle, GoopDialogTrigger,
  GoopTabs, GoopTabsContent, GoopTabsList, GoopTabsTrigger,
} from '@goopui/react'

export function Demo() {
  return (
    <GoopSidebarProvider>
    <GoopSidebar collapsible="icon">
      <GoopSidebarContent>
        <GoopSidebarMenu>
          <GoopSidebarMenuItem><GoopSidebarMenuButton isActive tooltip="Home">Sidebar home</GoopSidebarMenuButton></GoopSidebarMenuItem>
        </GoopSidebarMenu>
      </GoopSidebarContent>
      <GoopSidebarRail />
    </GoopSidebar>
    <GoopSidebarInset>
    <GoopSidebarTrigger />
    <main>
      <GoopButton>Hello goo</GoopButton>
      <GoopCarousel className="mx-12 w-48">
        <GoopCarouselContent>
          <GoopCarouselItem><div className="h-20 rounded-xl bg-muted">Slide one</div></GoopCarouselItem>
          <GoopCarouselItem><div className="h-20 rounded-xl bg-muted">Slide two</div></GoopCarouselItem>
        </GoopCarouselContent>
        <GoopCarouselPrevious />
        <GoopCarouselNext />
        <GoopCarouselDots />
      </GoopCarousel>
      <GoopTabs defaultValue="a">
        <GoopTabsList>
          <GoopTabsTrigger value="a">Tab A</GoopTabsTrigger>
          <GoopTabsTrigger value="b">Tab B</GoopTabsTrigger>
        </GoopTabsList>
        <GoopTabsContent value="a">Panel A</GoopTabsContent>
        <GoopTabsContent value="b">Panel B</GoopTabsContent>
      </GoopTabs>
      <GoopDialog>
        <GoopDialogTrigger asChild><GoopButton variant="outline">Open dialog</GoopButton></GoopDialogTrigger>
        <GoopDialogContent>
          <GoopDialogHeader>
            <GoopDialogTitle>Goo dialog</GoopDialogTitle>
            <GoopDialogDescription>It drips.</GoopDialogDescription>
          </GoopDialogHeader>
        </GoopDialogContent>
      </GoopDialog>
    </main>
    </GoopSidebarInset>
    </GoopSidebarProvider>
  )
}
EOF
}

make_react() {
  local dir="$1"
  mkdir -p "$dir/src"
  cat > "$dir/index.html" <<'EOF'
<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
EOF
  react_demo > "$dir/src/Demo.tsx"
  cat > "$dir/src/main.tsx" <<'EOF'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoopProvider } from '@goopui/react'
import { Demo } from './Demo'
import './style.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode><GoopProvider preset="subtle"><Demo /></GoopProvider></StrictMode>,
)
EOF
  printf '@import "tailwindcss";\n@import "@goopui/react/goop.css";\n' > "$dir/src/style.css"
  cat > "$dir/vite.config.ts" <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [react(), tailwindcss()] })
EOF
  # Only what a React consumer lists themselves: radix-ui, cva, cn, cuelume and core come
  # with @goopui/react.
  write_pkg "$dir" \
    "\"react\": \"^19.2.0\", \"react-dom\": \"^19.2.0\", \"tailwindcss\": \"^4.0.0\", \"@goopui/react\": \"file:$REACT\"" \
    '"vite": "^7.0.0", "@vitejs/plugin-react": "^5.0.0", "@tailwindcss/vite": "^4.0.0"'
}

make_next() {
  local dir="$1"
  mkdir -p "$dir/app"
  react_demo > "$dir/app/demo.tsx"
  cat > "$dir/app/transition.tsx" <<'EOF'
'use client'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { GoopPageTransition } from '@goopui/react'

export function Transition({ children }: { children: ReactNode }) {
  return <GoopPageTransition routeKey={usePathname()}>{children}</GoopPageTransition>
}
EOF
  cat > "$dir/app/layout.tsx" <<'EOF'
import type { ReactNode } from 'react'
import { GoopProvider } from '@goopui/react'
import { Transition } from './transition'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><GoopProvider preset="subtle"><Transition>{children}</Transition></GoopProvider></body>
    </html>
  )
}
EOF
  # A Server Component (no 'use client'): the goopUI components are client boundaries.
  # A next/link to a second page: the smoke test navigates through GoopPageTransition.
  cat > "$dir/app/page.tsx" <<'EOF'
import Link from 'next/link'
import { Demo } from './demo'
export default function Page() {
  return (
    <>
      <Demo />
      <Link href="/about" style={{ position: "fixed", top: 8, right: 8, zIndex: 50 }}>About page</Link>
    </>
  )
}
EOF
  mkdir -p "$dir/app/about"
  printf 'export default function About() {\n  return <p>About goo</p>\n}\n' > "$dir/app/about/page.tsx"
  printf '@import "tailwindcss";\n@import "@goopui/react/goop.css";\n' > "$dir/app/globals.css"
  printf 'export default { plugins: { "@tailwindcss/postcss": {} } }\n' > "$dir/postcss.config.mjs"
  cat > "$dir/next.config.mjs" <<EOF
export default { turbopack: { root: '$dir' }, outputFileTracingRoot: '$dir' }
EOF
  cat > "$dir/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["dom", "dom.iterable", "esnext"], "allowJs": false, "skipLibCheck": true,
    "strict": true, "noEmit": true, "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "react-jsx", "incremental": false,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
  write_pkg "$dir" \
    "\"next\": \"^16.0.0\", \"react\": \"^19.2.0\", \"react-dom\": \"^19.2.0\", \"tailwindcss\": \"^4.0.0\", \"@goopui/react\": \"file:$REACT\"" \
    '"@tailwindcss/postcss": "^4.0.0", "typescript": "~5.9.3", "@types/react": "^19.2.0", "@types/react-dom": "^19.2.0", "@types/node": "^24.0.0"'
}

install_cmd() { # $1 = manager, $2 = dir; sets cmd
  case "$1" in
    npm)   cmd=(npm install --no-audit --no-fund) ;;
    pnpm)  cmd=(pnpm install) ;;
    yarn1) cmd=(npx -y yarn@1.22.22 install --non-interactive --cache-folder "$2/.yarn-cache") ;;
    yarn4) touch "$2/yarn.lock"; printf 'nodeLinker: node-modules\nenableGlobalCache: false\nenableImmutableInstalls: false\n' > "$2/.yarnrc.yml"
           cmd=(npx -y @yarnpkg/cli-dist@4 install) ;;
    bun)   if command -v bun >/dev/null 2>&1; then cmd=(bun install); else cmd=(npx -y bun@1 install); fi ;;
    *) return 1 ;;
  esac
}

# Serves the built app on $PORT and smoke-tests it in headless Chromium.
smoke() { # $1 = app, $2 = dir
  [ "$SMOKE" = 1 ] && [ "$1" != vue ] || return 0
  local bin="$2/node_modules/.bin" pid ok=0
  if [ "$1" = next ]; then (cd "$2" && exec "$bin/next" start -p "$PORT" > serve.log 2>&1) & pid=$!
  else (cd "$2" && exec "$bin/vite" preview --port "$PORT" --strictPort > serve.log 2>&1) & pid=$!
  fi
  local nav=''
  [ "$1" = next ] && nav='About page|About goo'
  (cd "$ROOT" && NAV="$nav" node scripts/smoke-page.mjs "http://localhost:$PORT/" 'Hello goo' 'Open dialog' > "$2/smoke.log" 2>&1) || ok=1
  kill "$pid" 2>/dev/null; pkill -f "$2/node_modules" 2>/dev/null; wait "$pid" 2>/dev/null
  return $ok
}

build_and_check() { # $1 = app, $2 = dir; returns 0 on PASS, prints the reason otherwise
  local dir="$2" out
  if [ "$1" = next ]; then
    (cd "$dir" && npx --no-install next build > build.log 2>&1) || { echo "build failed"; return 1; }
    out="$dir/.next"
    # The page is a Server Component: the goopUI markup must be in the prerendered HTML.
    grep -q 'Hello goo' "$out/server/app/index.html" 2>/dev/null || { echo "not server-rendered"; return 1; }
    grep -q 'Tab A' "$out/server/app/index.html" || { echo "tabs not server-rendered"; return 1; }
    grep -q 'Slide one' "$out/server/app/index.html" || { echo "carousel not server-rendered"; return 1; }
    grep -q 'data-slot="sidebar-wrapper"' "$out/server/app/index.html" || { echo "sidebar not server-rendered"; return 1; }
  else
    (cd "$dir" && npx --no-install vite build > build.log 2>&1) || { echo "build failed"; return 1; }
    out="$dir/dist"
    grep -q 'Hello goo' "$out"/assets/*.js || { echo "marker missing from bundle"; return 1; }
  fi
  if grep -rlq 'workspace:\*' "$dir"/node_modules/@goopui/*/package.json "$out" 2>/dev/null; then
    echo "workspace:* in installed manifests or build output"; return 1
  fi
  smoke "$1" "$dir" || { echo "smoke test failed (see smoke.log)"; return 1; }
}

results=()
for m in "${MANAGERS[@]}"; do
  for app in "${APP_LIST[@]}"; do
    dir="$WORK/$m-$app"
    mkdir -p "$dir"
    "make_$app" "$dir" || { echo "unknown app: $app"; fail=1; continue; }
    install_cmd "$m" "$dir" || { echo "unknown manager: $m"; fail=1; rm -rf "$dir"; continue 2; }
    [ "$m" = pnpm ] || mv "$dir/pnpm-workspace.yaml" "$dir/pnpm-workspace.yaml.skip"
    (cd "$dir" && "${cmd[@]}" > install.log 2>&1)  # pnpm exits 1 on ignored tool builds; the build decides
    if reason="$(build_and_check "$app" "$dir")"; then
      line="PASS  $m × $app"
      rm -rf "$dir"
    else
      line="FAIL  $m × $app: $reason  (logs: $dir/{install,build,serve,smoke}.log)"
      fail=1
    fi
    echo "$line"; results+=("$line")
    case "$line" in FAIL*)
      grep -iE 'error|could not resolve|failed' "$dir/install.log" "$dir/build.log" "$dir/smoke.log" 2>/dev/null | head -8 ;;
    esac
  done
done

echo; echo "Summary:"; printf '  %s\n' "${results[@]}"
[ $fail -eq 0 ] && rm -rf "$WORK"
exit $fail

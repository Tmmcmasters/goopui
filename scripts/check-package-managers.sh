#!/usr/bin/env bash
# Packs @goopui/{core,vue,react,nuxt} and, with each of npm, pnpm, yarn 1, yarn 4 and bun,
# installs the tarballs into fresh consumer apps and builds them (react18, nuxt and the
# lowest-peer apps are described in the "Release-hardening apps" block below):
#   vue    Vite + Vue + Tailwind v4 (GoopButton, GoopSwitch), vue-tsc on typed usage
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
# through npx. Pass names to run a subset: `... npm yarn4`; APPS="react next" limits the apps
# (default: vue react react18 next nuxt; also vue-min react-min nuxt-min).
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
read -r -a APP_LIST <<< "${APPS:-vue react react18 next nuxt}"
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
  vue_typecheck_sfc 1 > "$dir/src/TypeCheck.vue" # vue-tsc only, never imported
  printf '%s\n' "${VITE_TSCONFIG/JSXJSX/preserve}" > "$dir/tsconfig.json"
  cat > "$dir/vite.config.ts" <<'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [vue(), tailwindcss()] })
EOF
  # vue-sonner is deliberately NOT listed: it's a dependency of @goopui/vue.
  write_pkg "$dir" \
    "\"vue\": \"^3.5.0\", \"tailwindcss\": \"^4.0.0\", \"@goopui/vue\": \"file:$VUE\"" \
    '"vite": "^7.0.0", "@vitejs/plugin-vue": "^6.0.0", "@tailwindcss/vite": "^4.0.0", "typescript": "~5.9.3", "vue-tsc": "^3.0.0"'
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
  react_typecheck_tsx > "$dir/app/typecheck.tsx" # `next build` type-checks it
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

# ---- Release-hardening apps and checks ---------------------------------------------------------
# react18  the Vite React app on React 18 (@goopui/react's peer range claims ^18), smoke-tested
#          and type-checked against @types/react 18
# nuxt     Nuxt 4 + Tailwind v4 (@tailwindcss/vite) with `modules: ['@goopui/nuxt']`, as the
#          docs' install page says. Auto-imported GoopButton/GoopDialog/GoopSelect: `nuxt
#          typecheck` (vue-tsc), `nuxt build` (SSR server smoke-tested), `nuxt generate`
# vue-min / react-min / nuxt-min  the lowest versions the peer ranges claim (Vue 3.5.2, React
#          18.0.0, Nuxt 3.13.0, Tailwind 4.0.0): `APPS="vue-min react-min nuxt-min"`
# The Vite apps also prove tree-shaking (a component the app never imports is not in the
# bundle) and that goop.css reaches the built CSS; vue/vue-min run vue-tsc and the React Vite
# apps tsc on a TypeCheck file whose @ts-expect-error / @vue-expect-error lines fail if the
# shipped .d.ts degrade to `any`.
NUXT="$(ls "$TGZ"/goopui-nuxt-*.tgz)"
UNUSED_MARKER='command-input-wrapper' # a data-slot only GoopCommand renders; no app imports it
CSS_MARKER='--goop-stroke-width'      # a token only goop.css defines

# Like write_pkg, but pins @goopui/core AND @goopui/vue to their tarballs (@goopui/nuxt's
# manifest names the same unpublished version of both).
write_pkg_nuxt() {
  write_pkg "$@"
  local f="$1/package.json"
  node -e '
    const fs = require("fs"); const [f, vue] = process.argv.slice(1)
    const p = JSON.parse(fs.readFileSync(f, "utf8"))
    p.overrides["@goopui/vue"] = p.resolutions["@goopui/vue"] = "file:" + vue
    fs.writeFileSync(f, JSON.stringify(p, null, 2))' "$f" "$VUE"
  printf '  "@goopui/vue": "file:%s"\n' "$VUE" >> "$1/pnpm-workspace.yaml"
}

# Pins Tailwind's internals to the app's Tailwind version ($2). @tailwindcss/vite 4.0.0 depends
# on `@tailwindcss/node: ^4.0.0`, so a fresh install pairs it with today's 4.x internals and it
# crashes ("Cannot convert undefined or null to object") even with no goopUI CSS at all. An
# app that really is on 4.0.0 has a lockfile holding them at 4.0.0; this reproduces that.
pin_tailwind() {
  node -e '
    const fs = require("fs"); const [f, v] = process.argv.slice(1)
    const p = JSON.parse(fs.readFileSync(f, "utf8"))
    for (const d of ["@tailwindcss/node", "@tailwindcss/oxide"]) p.overrides[d] = p.resolutions[d] = v
    fs.writeFileSync(f, JSON.stringify(p, null, 2))' "$1/package.json" "$2"
  printf '  "@tailwindcss/node": "%s"\n  "@tailwindcss/oxide": "%s"\n' "$2" "$2" >> "$1/pnpm-workspace.yaml"
}

# Typed usage of the Vue components. $1 = 1 to import them (plain Vue), 0 for Nuxt
# auto-imports. Never rendered: vue-tsc only. Each *-expect-error line must be an error, so
# components typed as `any` (an empty .vue.d.ts, an unresolvable import) fail the check.
vue_typecheck_sfc() {
  echo '<script setup lang="ts">'
  [ "$1" = 1 ] && cat <<'EOF'
import { ref } from 'vue'
import {
  GoopButton, GoopSwitch, GoopDialog, GoopDialogContent, GoopDialogTitle,
  GoopSelect, GoopSelectContent, GoopSelectItem, GoopSelectTrigger, GoopSelectValue,
  buttonVariants, type ButtonVariant,
} from '@goopui/vue'
EOF
  # Nuxt: the app only depends on @goopui/nuxt (with pnpm it can't import @goopui/vue), so
  # types come from Nuxt's own `#components`.
  [ "$1" = 1 ] || cat <<'EOF'
import type { GoopButton } from '#components'
type ButtonVariant = NonNullable<InstanceType<typeof GoopButton>['$props']['variant']>
const buttonVariants = (o: { variant: ButtonVariant; size: string }) => `${o.variant} ${o.size}`
EOF
  cat <<'EOF'
const on = ref(false)
const count = ref(1)
const fruit = ref('Apple')
const open = ref(false)
const variant: ButtonVariant = 'outline'
// @ts-expect-error not a ButtonVariant
const badVariant: ButtonVariant = 'nope'
const cls: string = buttonVariants({ variant: 'ghost', size: 'sm' })
</script>

<template>
  <GoopButton :variant="variant" size="sm" preset="wild" renderer="canvas" :drips="false">ok</GoopButton>
  <!-- @vue-expect-error 'nope' is not a variant -->
  <GoopButton variant="nope">bad</GoopButton>
  <!-- @vue-expect-error 'nope' is not a preset -->
  <GoopButton preset="nope">bad</GoopButton>
  <GoopSwitch v-model="on" />
  <!-- @vue-expect-error the switch's v-model is a boolean -->
  <GoopSwitch v-model="count" />
  <GoopSelect v-model="fruit">
    <GoopSelectTrigger><GoopSelectValue placeholder="Fruit" /></GoopSelectTrigger>
    <GoopSelectContent><GoopSelectItem value="Apple">Apple</GoopSelectItem></GoopSelectContent>
  </GoopSelect>
  <GoopDialog v-model:open="open">
    <GoopDialogContent><GoopDialogTitle>Typed</GoopDialogTitle></GoopDialogContent>
  </GoopDialog>
  <!-- @vue-expect-error open is a boolean -->
  <GoopDialog :open="count" />
  <span>{{ badVariant }} {{ cls }}</span>
</template>
EOF
}

# Typed usage of the React components (tsc / next build). Never rendered.
react_typecheck_tsx() {
  cat <<'EOF'
import { createRef, type ComponentProps } from 'react'
import { GoopButton, GoopDialog, GoopSwitch, buttonVariants, type ButtonVariant } from '@goopui/react'

const variant: ButtonVariant = 'outline'
// @ts-expect-error not a ButtonVariant
const badVariant: ButtonVariant = 'nope'
// @ts-expect-error not a variant
const badProps: ComponentProps<typeof GoopButton> = { variant: 'nope' }
export const cls: string = buttonVariants({ variant: 'ghost', size: 'sm' })

export function TypeCheck() {
  const ref = createRef<HTMLButtonElement>()
  return (
    <>
      <GoopButton ref={ref} variant={variant} size="sm" preset="wild" renderer="canvas" drips={false}>ok</GoopButton>
      {/* @ts-expect-error 'nope' is not a preset */}
      <GoopButton preset="nope">bad</GoopButton>
      <GoopSwitch checked onCheckedChange={(c: boolean) => void c} />
      {/* @ts-expect-error checked is a boolean */}
      <GoopSwitch checked={1} />
      <GoopDialog open onOpenChange={(o: boolean) => void o} />
      <span>{String(badVariant)}{String(badProps)}</span>
    </>
  )
}
EOF
}

VITE_TSCONFIG='{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler", "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true, "noEmit": true, "skipLibCheck": true, "isolatedModules": true, "jsx": "JSXJSX", "types": ["vite/client"]
  },
  "include": ["src"]
}'

make_react18() {
  make_react "$1"
  react_typecheck_tsx > "$1/src/TypeCheck.tsx"
  printf '%s\n' "${VITE_TSCONFIG/JSXJSX/react-jsx}" > "$1/tsconfig.json"
  write_pkg "$1" \
    "\"react\": \"${REACT18:-^18.0.0}\", \"react-dom\": \"${REACT18:-^18.0.0}\", \"tailwindcss\": \"^4.0.0\", \"@goopui/react\": \"file:$REACT\"" \
    '"vite": "^7.0.0", "@vitejs/plugin-react": "^5.0.0", "@tailwindcss/vite": "^4.0.0", "typescript": "~5.9.3", "@types/react": "^18.0.0", "@types/react-dom": "^18.0.0"'
}

# The lowest claimed peers: React 18.0.0 and Tailwind 4.0.0 (with the Vite its plugin supports).
make_react-min() {
  REACT18=18.0.0 make_react18 "$1"
  write_pkg "$1" \
    "\"react\": \"18.0.0\", \"react-dom\": \"18.0.0\", \"tailwindcss\": \"4.0.0\", \"@goopui/react\": \"file:$REACT\"" \
    '"vite": "^6.0.0", "@vitejs/plugin-react": "^4.3.0", "@tailwindcss/vite": "4.0.0", "typescript": "~5.9.3", "@types/react": "^18.0.0", "@types/react-dom": "^18.0.0"'
  pin_tailwind "$1" 4.0.0
}

make_vue-min() {
  make_vue "$1"
  write_pkg "$1" \
    "\"vue\": \"3.5.2\", \"tailwindcss\": \"4.0.0\", \"@goopui/vue\": \"file:$VUE\"" \
    '"vite": "^6.0.0", "@vitejs/plugin-vue": "^5.2.0", "@tailwindcss/vite": "4.0.0", "typescript": "~5.9.3", "vue-tsc": "^3.0.0"'
  pin_tailwind "$1" 4.0.0
}

# $2 = nuxt version, $3 = source dir ('app' in Nuxt 4, the root in Nuxt 3), $4/$5 = tailwind,
# @tailwindcss/vite versions.
make_nuxt() {
  local dir="$1" ver="${2:-^4.0.0}" src="$1/${3-app}" tw="${4:-^4.0.0}"
  mkdir -p "$src/assets/css" "$src/components"
  cat > "$dir/nuxt.config.ts" <<'EOF'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@goopui/nuxt'],
  css: ['~/assets/css/main.css', 'vue-sonner/style.css'],
  vite: { plugins: [tailwindcss()] },
  devtools: { enabled: false },
  telemetry: false,
})
EOF
  printf '@import "tailwindcss";\n' > "$src/assets/css/main.css"
  # Auto-imported (no import lines): GoopButton, GoopDialog*, GoopSelect*.
  cat > "$src/app.vue" <<'EOF'
<script setup lang="ts">
import { toast } from 'vue-sonner' // the docs: apps using GoopToaster add vue-sonner themselves
const fruit = ref('Apple')
const open = ref(false)
</script>

<template>
  <main class="p-8">
    <GoopButton variant="default" size="sm" @click="toast('Toasted')">Hello goo</GoopButton>
    <GoopToaster />
    <GoopSelect v-model="fruit">
      <GoopSelectTrigger class="w-44"><GoopSelectValue placeholder="Pick a fruit" /></GoopSelectTrigger>
      <GoopSelectContent>
        <GoopSelectItem value="Apple">Apple</GoopSelectItem>
        <GoopSelectItem value="Banana">Banana</GoopSelectItem>
      </GoopSelectContent>
    </GoopSelect>
    <GoopDialog v-model:open="open">
      <GoopDialogTrigger as-child><GoopButton variant="outline">Open dialog</GoopButton></GoopDialogTrigger>
      <GoopDialogContent>
        <GoopDialogHeader>
          <GoopDialogTitle>Goo dialog</GoopDialogTitle>
          <GoopDialogDescription>It drips.</GoopDialogDescription>
        </GoopDialogHeader>
      </GoopDialogContent>
    </GoopDialog>
  </main>
</template>
EOF
  vue_typecheck_sfc 0 > "$src/components/TypeCheck.vue"
  # What `nuxi init` writes: project references in Nuxt 4, one generated config in Nuxt 3.
  if [ "${3-app}" = app ]; then
    printf '{ "files": [], "references": [%s] }\n' \
      '{ "path": "./.nuxt/tsconfig.app.json" }, { "path": "./.nuxt/tsconfig.server.json" }, { "path": "./.nuxt/tsconfig.shared.json" }, { "path": "./.nuxt/tsconfig.node.json" }' \
      > "$dir/tsconfig.json"
  else
    printf '{ "extends": "./.nuxt/tsconfig.json" }\n' > "$dir/tsconfig.json"
  fi
  write_pkg_nuxt "$dir" \
    "\"nuxt\": \"$ver\", \"vue\": \"^3.5.0\", \"vue-sonner\": \"^2.0.0\", \"tailwindcss\": \"$tw\", \"@tailwindcss/vite\": \"${5:-^4.0.0}\", \"@goopui/nuxt\": \"file:$NUXT\"" \
    '"typescript": "~5.9.3", "vue-tsc": "^3.0.0"'
}

# vue-sonner 2.0.9 added an optional `nuxt ^4` peer, so npm refuses (ERESOLVE) to put it in a
# Nuxt 3 app at all, goopUI or not. A Nuxt 3 app that adds vue-sonner itself pins 2.0.8.
make_nuxt-min() {
  make_nuxt "$1" 3.13.0 '' 4.0.0 4.0.0
  pin_tailwind "$1" 4.0.0
  sed -i.bak 's/"vue-sonner": "^2.0.0"/"vue-sonner": "2.0.8"/' "$1/package.json" && rm "$1/package.json.bak"
}

# Shared by every Vite app: tree-shaking, goop.css, and the consumer typecheck.
vite_extras() { # $1 = app, $2 = dir
  local dir="$2" pkg=react
  case "$1" in vue*) pkg=vue ;; esac
  grep -rqF "$UNUSED_MARKER" "$dir/node_modules/@goopui/$pkg/dist" || { echo "tree-shake marker not in @goopui/$pkg (update UNUSED_MARKER)"; return 1; }
  if grep -qF "$UNUSED_MARKER" "$dir"/dist/assets/*.js; then echo "tree-shaking failed: unused GoopCommand is in the bundle"; return 1; fi
  grep -qF -- "$CSS_MARKER" "$dir"/dist/assets/*.css || { echo "goop.css missing from the built CSS"; return 1; }
  case "$1" in
    vue*) (cd "$dir" && npx --no-install vue-tsc --noEmit > typecheck.log 2>&1) || { echo "vue-tsc failed (see typecheck.log)"; return 1; } ;;
    react18|react-min) (cd "$dir" && npx --no-install tsc -p . > typecheck.log 2>&1) || { echo "tsc failed (see typecheck.log)"; return 1; } ;;
  esac
}
extra_vue() { vite_extras vue "$1"; }
extra_vue-min() { vite_extras vue-min "$1"; }
extra_react() { vite_extras react "$1"; }
extra_react18() { vite_extras react18 "$1"; }
extra_react-min() { vite_extras react-min "$1"; }

check_nuxt() { # $1 = dir
  local dir="$1" bin="$1/node_modules/.bin" pid ok=0 html
  (cd "$dir" && "$bin/nuxt" typecheck > typecheck.log 2>&1) || { echo "nuxt typecheck failed (see typecheck.log)"; return 1; }
  (cd "$dir" && "$bin/nuxt" build > build.log 2>&1) || { echo "nuxt build failed"; return 1; }
  if grep -rlq 'workspace:\*' "$dir"/node_modules/@goopui/*/package.json "$dir/.output" 2>/dev/null; then
    echo "workspace:* in installed manifests or build output"; return 1
  fi
  if [ "$SMOKE" = 1 ]; then
    (cd "$dir" && PORT="$PORT" HOST=127.0.0.1 exec node .output/server/index.mjs > serve.log 2>&1) & pid=$!
    (cd "$ROOT" && node scripts/smoke-page.mjs "http://127.0.0.1:$PORT/" 'Hello goo' 'Open dialog' > "$dir/smoke.log" 2>&1) || ok=1
    kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
    [ $ok = 0 ] || { echo "smoke test failed (see smoke.log)"; return 1; }
  fi
  [ "${GENERATE:-1}" = 1 ] || return 0
  (cd "$dir" && "$bin/nuxt" generate > generate.log 2>&1) || { echo "nuxt generate failed (see generate.log)"; return 1; }
  html="$dir/.output/public/index.html"
  grep -q 'Hello goo' "$html" 2>/dev/null || { echo "generate: GoopButton not prerendered"; return 1; }
  grep -q 'data-slot="select-trigger"' "$html" || { echo "generate: GoopSelect not prerendered"; return 1; }
  cat "$html" "$dir"/.output/public/_nuxt/*.css 2>/dev/null | grep -qF -- "$CSS_MARKER" || { echo "goop.css missing from the generated CSS"; return 1; }
}
# Nuxt 3.13.0 itself can no longer `nuxt generate` with the nitropack/unstorage a fresh install
# pulls today (a bare 3.13.0 app with no modules fails the same way: 500 in unstorage itemKey
# while prerendering), so the lowest Nuxt is type-checked, built and smoke-tested only.
check_nuxt-min() { GENERATE=0 check_nuxt "$@"; }
# ---- end of release-hardening apps -------------------------------------------------------------

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
  [ "$SMOKE" = 1 ] && [ "${1%-min}" != vue ] || return 0 # the Vite Vue apps have no dialog; nuxt smoke-tests Vue
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
  if declare -F "check_$1" >/dev/null; then "check_$1" "$dir"; return; fi
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
  if declare -F "extra_$1" >/dev/null; then "extra_$1" "$dir" || return 1; fi
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

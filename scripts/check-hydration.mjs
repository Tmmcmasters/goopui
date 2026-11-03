#!/usr/bin/env node
// Hydration check for the docs site: every page must hydrate without a mismatch.
//
// Loads each page fresh (a full SSR load, not a client navigation) in headless Chromium and
// collects every hydration warning/error from the console. In dev mode Vue prints the exact
// node that differs ("Hydration node mismatch", "Hydration attribute mismatch", ...); a
// production build only prints "Hydration completed but contains mismatches.".
//
// Usage: start the site (`pnpm dev:www`), or check a production build: build with mismatch
// details (`DEBUG_HYDRATION=1 pnpm --filter www generate`) and serve .output/public the way the
// deploy does (Caddy: /x is served from x/index.html, no redirect to /x/). Then
//   pnpm check:hydration                          # landing + every docs page
//   BASE_URL=http://localhost:3001 pnpm check:hydration
//   pnpm check:hydration sheet command            # only these component pages
//   pnpm check:hydration /docs /                  # any path works too
// Env: BASE_URL (default http://localhost:3001), CHROMIUM_PATH (a Chromium/headless-shell
// binary; default: playwright-core's own download), VERBOSE=1 (print every console line),
// LIGHT=1 (stored light theme), REDUCED=1 (OS + site reduced motion), MOBILE=1 (phone viewport):
// client-only state that setup code must not read during hydration.

import { chromium } from 'playwright-core'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const VERBOSE = !!process.env.VERBOSE

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HYDRATION = /hydrat/i

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
// A wide viewport by default so the desktop sidebar / TOC (hidden on small screens) render too.
const ctx = await browser.newContext({
  viewport: process.env.MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  isMobile: !!process.env.MOBILE,
  hasTouch: !!process.env.MOBILE,
  reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
})
await ctx.addInitScript(
  ([light, reduced]) => {
    try {
      if (light) localStorage.setItem('goop-theme', 'light')
      if (reduced) localStorage.setItem('goop-reduced-motion', 'true')
    } catch {}
  },
  [!!process.env.LIGHT, !!process.env.REDUCED],
)

/** Every docs page: the components index links each component, the sidebar every guide page. */
async function docsPaths() {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/docs/components`, { waitUntil: 'load' })
  const hrefs = await page.$$eval('a[href^="/docs/"]', (as) => as.map((a) => a.getAttribute('href')))
  await page.close()
  return [...new Set(hrefs.map((h) => h.split(/[?#]/)[0].replace(/\/$/, '')))].sort()
}

const args = process.argv.slice(2)
let paths
if (args.length) {
  paths = args.map((a) => (a.startsWith('/') ? a : `/docs/components/${a}`))
} else {
  const docs = (await docsPaths()).filter((p) => p !== '/docs' && p !== '/docs/components')
  if (!docs.some((p) => p.startsWith('/docs/components/'))) {
    console.error(`No component links found on ${BASE}/docs/components`)
    process.exit(2)
  }
  paths = ['/', '/docs', '/docs/components', ...docs]
}

async function check(path) {
  const page = await ctx.newPage()
  const hits = []
  const all = []
  page.on('console', (m) => {
    const text = m.text()
    all.push(`[${m.type()}] ${text}`)
    if (HYDRATION.test(text)) hits.push(text)
  })
  page.on('pageerror', (e) => {
    all.push(`[pageerror] ${e.message}`)
    if (HYDRATION.test(e.message)) hits.push(e.message)
  })
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  // Hydration finishes after `load` (async chunks, Suspense); give it a moment.
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(1000)
  // A host that redirects /x to /x/ (a static server's directory redirect) makes the client
  // hydrate a different route than the one prerendered for /x. Name it: it's the usual cause.
  const landed = new URL(page.url()).pathname
  if (landed !== path && hits.length) hits.push(`(redirected ${path} -> ${landed}; the page was rendered for ${path})`)
  await page.close()
  return { path, hits, all }
}

let failed = 0
for (const path of paths) {
  let r
  try {
    r = await check(path)
  } catch (e) {
    console.log(`${path.padEnd(36)} ERROR ${e.message.split('\n')[0]}`)
    failed++
    continue
  }
  if (r.hits.length) failed++
  console.log(`${path.padEnd(36)} ${r.hits.length ? `MISMATCH (${r.hits.length})` : 'ok'}`)
  for (const h of r.hits) console.log(`    ${h.split('\n').slice(0, 12).join('\n    ')}`)
  if (VERBOSE) for (const l of r.all) console.log(`      ${l.split('\n')[0]}`)
}
await browser.close()
console.log(failed ? `\n${failed} page(s) hydrated with mismatches.` : `\nAll ${paths.length} pages hydrated cleanly.`)
process.exit(failed ? 1 : 0)

#!/usr/bin/env node
// Hydration check for the website (apps/www): every page must hydrate without a mismatch.
//
// By default it builds the site the way the deploy does (`nuxt generate`), but with Vue's
// hydration-mismatch details on (DEBUG_HYDRATION=1 -> `debug.hydration` in nuxt.config.ts),
// serves .output/public like Caddy's `file_server` (apps/www/Caddyfile), and loads every page
// fresh (a full load of the prerendered HTML, not a client navigation) in headless Chromium,
// once per preference scenario. Any console line about hydration, any console error and any
// uncaught page error counts.
//
// Usage:
//   pnpm check:hydration                      # build + serve on :3050 + check every page
//   pnpm check:hydration --no-build           # reuse the existing apps/www/.output/public
//   pnpm check:hydration sheet /docs /        # only these pages (bare names = component pages)
//   BASE_URL=https://goop.timmcmasters.work pnpm check:hydration   # a running site (no build)
// Env: BASE_URL, PORT (default 3050), CHROMIUM_PATH (a Chromium/headless-shell binary;
// default: playwright-core's own download), SCENARIOS (comma list, default all), VERBOSE=1
// (print every console line).
//
// Pages: every internal link reachable from /, /docs and /docs/components (crawled), plus
// every prerendered index.html when serving a local build.

import { spawnSync } from 'node:child_process'
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = resolve(fileURLToPath(import.meta.url), '../..')
const WWW = join(ROOT, 'apps/www')
const PUBLIC = join(WWW, '.output/public')
const argv = process.argv.slice(2)
const NO_BUILD = argv.includes('--no-build')
const only = argv.filter((a) => !a.startsWith('--'))
const VERBOSE = !!process.env.VERBOSE
const PORT = Number(process.env.PORT ?? 3050)
const REMOTE = process.env.BASE_URL?.replace(/\/$/, '')

/** Client-only state the server can't know. Each scenario is a fresh browser context. */
const ALL_SCENARIOS = {
  // A first visit: nothing stored, OS defaults.
  fresh: { storage: {}, reducedMotion: 'no-preference', colorScheme: 'dark' },
  // A returning visitor who changed everything: light theme, site reduced-motion switch, sound
  // muted, bun tabs, a cached star count, plus OS reduced motion and a light OS scheme.
  prefs: {
    storage: {
      'goop-theme': 'light',
      'goop-reduced-motion': 'true',
      'goop-sound': 'off',
      'goop-pm': 'bun',
      'goop-github-stars': JSON.stringify({ n: 4321, t: 'NOW' }),
    },
    reducedMotion: 'reduce',
    colorScheme: 'light',
  },
  // Phone viewport (touch, coarse pointer), nothing stored.
  mobile: { storage: {}, reducedMotion: 'no-preference', colorScheme: 'dark', mobile: true },
}
const SCENARIOS = (process.env.SCENARIOS ?? Object.keys(ALL_SCENARIOS).join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------------------------
// Build
if (!REMOTE && !NO_BUILD) {
  console.log('Generating apps/www with hydration-mismatch details (DEBUG_HYDRATION=1)...')
  const r = spawnSync('pnpm', ['--filter', 'www', 'generate'], {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, DEBUG_HYDRATION: '1' },
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
if (!REMOTE && !existsSync(PUBLIC)) {
  console.error(`No build at ${PUBLIC}. Run without --no-build.`)
  process.exit(2)
}

// ---------------------------------------------------------------------------------------------
// A static server that behaves like apps/www/Caddyfile (Caddy's semantics, mirrored here so the
// check needs no Caddy install):
// - `redir @slash`: /path/ 308s to /path (the root / excepted),
// - `try_files {path} {path}/index.html`: a file at {path} (a directory doesn't count: Caddy's
//   strict check wants a trailing slash for those), else {path}/index.html,
// - `file_server`: a directory serves its index.html; canonical-URI redirects only apply when
//   try_files didn't rewrite the file name (so /docs/x served from x/index.html never 308s),
// - `handle_errors`: anything missing serves /404.html with status 404.
// OLD_CADDY=1 mimics the Caddyfile before the trailing-slash fix (plain file_server), which
// 308s /docs/x to /docs/x/: the before-state of the live site.
const OLD_CADDY = !!process.env.OLD_CADDY
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.wasm': 'application/wasm',
}
function send(res, file, status = 200) {
  res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
  createReadStream(file).pipe(res)
}
const fsPath = (p) => normalize(join(PUBLIC, p))
const kind = (p) => {
  try {
    return statSync(p).isDirectory() ? 'dir' : 'file'
  } catch {
    return null
  }
}
function redirect(res, to) {
  res.writeHead(308, { location: to })
  res.end()
}
function caddyLike(req, res) {
  const url = new URL(req.url, 'http://x')
  const query = url.search
  let path
  try {
    path = decodeURIComponent(url.pathname)
  } catch {
    path = url.pathname
  }
  const notFound = () => send(res, join(PUBLIC, '404.html'), 404)
  if (!OLD_CADDY) {
    const m = /^(.+)\/$/.exec(url.pathname)
    if (m) return redirect(res, m[1] + query)
    // try_files: strict existence (a slash-less path must be a file).
    if (kind(fsPath(path)) !== 'file' && !path.endsWith('/') && kind(fsPath(`${path}/index.html`)) === 'file') {
      path = `${path}/index.html` // rewritten file name: file_server won't canonicalize it
      return send(res, fsPath(path))
    }
  }
  const file = fsPath(path)
  if (file !== PUBLIC && !file.startsWith(PUBLIC + sep)) return notFound()
  const k = kind(file)
  if (!k) return notFound()
  if (k === 'dir') {
    if (!url.pathname.endsWith('/')) return redirect(res, `${url.pathname}/${query}`)
    const index = join(file, 'index.html')
    return kind(index) === 'file' ? send(res, index) : notFound()
  }
  if (url.pathname.endsWith('/')) return redirect(res, `${url.pathname.replace(/\/+$/, '')}${query}`)
  send(res, file)
}

let server
let BASE = REMOTE
if (!REMOTE) {
  server = createServer(caddyLike)
  await new Promise((ok, fail) => server.once('error', fail).listen(PORT, '127.0.0.1', ok))
  BASE = `http://127.0.0.1:${PORT}`
  console.log(`Serving ${relative(ROOT, PUBLIC)} at ${BASE} (like the Caddyfile${OLD_CADDY ? ' before the trailing-slash fix' : ''})`)
}

/** Prerendered pages in the local build: every <dir>/index.html, as its slash-less route. */
function builtRoutes(dir = PUBLIC) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name.startsWith('_')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...builtRoutes(p))
    else if (name === 'index.html') out.push('/' + relative(PUBLIC, dir).split(sep).join('/'))
  }
  return out.map((r) => (r === '/' ? '/' : r.replace(/\/$/, '')))
}

// ---------------------------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

async function newContext(name) {
  const s = ALL_SCENARIOS[name]
  const ctx = await browser.newContext({
    // Wide by default so the desktop sidebar / TOC (hidden on small screens) render too.
    viewport: s.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: !!s.mobile,
    hasTouch: !!s.mobile,
    reducedMotion: s.reducedMotion,
    colorScheme: s.colorScheme,
  })
  // Never hit the GitHub API from the check (rate limits, noise).
  await ctx.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"stargazers_count":4321}' }))
  await ctx.addInitScript((storage) => {
    try {
      for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v.replace('"NOW"', String(Date.now())))
    } catch {}
  }, s.storage)
  return ctx
}

/** Same-origin page links (no assets), as slash-less paths. */
async function linksOn(page) {
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href))
  const origin = new URL(BASE).origin
  return hrefs
    .map((h) => new URL(h))
    .filter((u) => u.origin === origin && !extname(u.pathname))
    .map((u) => (u.pathname === '/' ? '/' : u.pathname.replace(/\/+$/, '')))
}

async function discover(ctx) {
  const seen = new Set(['/', '/docs', '/docs/components'])
  if (!REMOTE) for (const r of builtRoutes()) seen.add(r)
  const queue = [...seen]
  const page = await ctx.newPage()
  while (queue.length) {
    const path = queue.shift()
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
      for (const l of await linksOn(page)) if (!seen.has(l)) (seen.add(l), queue.push(l))
    } catch {}
  }
  await page.close()
  return [...seen].filter((p) => p !== '/404' && p !== '/200').sort()
}

const HYDRATION = /hydrat/i

async function check(ctx, path) {
  const page = await ctx.newPage()
  const hits = []
  const errors = []
  const all = []
  page.on('console', (m) => {
    const text = m.text()
    all.push(`[${m.type()}] ${text}`)
    if (HYDRATION.test(text)) hits.push(text)
    else if (m.type() === 'error') errors.push(text)
  })
  page.on('pageerror', (e) => {
    all.push(`[pageerror] ${e.message}`)
    ;(HYDRATION.test(e.message) ? hits : errors).push(`pageerror: ${e.message}`)
  })
  // Hydration mismatch details print the DOM node as an object; pull its outerHTML.
  page.on('console', async (m) => {
    if (!HYDRATION.test(m.text())) return
    for (const arg of m.args()) {
      try {
        const html = await arg.evaluate((v) => (v instanceof Node ? (v.outerHTML ?? v.textContent ?? '').slice(0, 300) : null))
        if (html) hits.push(`    node: ${html}`)
      } catch {}
    }
  })
  const res = await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await sleep(800)
  const landed = new URL(page.url()).pathname
  await page.close()
  return { path, landed, status: res?.status(), hits, errors, all }
}

const wanted = only.map((a) => (a.startsWith('/') ? a : `/docs/components/${a}`))
let totalBad = 0
const summary = []
for (const name of SCENARIOS) {
  if (!ALL_SCENARIOS[name]) {
    console.error(`Unknown scenario ${name}. Known: ${Object.keys(ALL_SCENARIOS).join(', ')}`)
    process.exit(2)
  }
  const ctx = await newContext(name)
  const paths = wanted.length ? wanted : await discover(ctx)
  console.log(`\n== ${name}: ${paths.length} pages on ${BASE}`)
  let bad = 0
  for (const path of paths) {
    let r
    try {
      r = await check(ctx, path)
    } catch (e) {
      console.log(`${path.padEnd(40)} ERROR ${e.message.split('\n')[0]}`)
      bad++
      continue
    }
    const n = r.hits.filter((h) => !h.startsWith('    node:')).length
    const status = r.status && r.status >= 400 ? ` HTTP ${r.status}` : ''
    const moved = r.landed !== path ? ` (-> ${r.landed})` : ''
    const failed = n || r.errors.length || status
    if (failed) bad++
    console.log(`${path.padEnd(40)} ${n ? `MISMATCH (${n})` : 'ok'}${r.errors.length ? ` ERRORS (${r.errors.length})` : ''}${status}${moved}`)
    for (const h of r.hits) console.log(`    ${h.split('\n').slice(0, 14).join('\n    ')}`)
    for (const e of r.errors) console.log(`    error: ${e.split('\n')[0]}`)
    if (VERBOSE) for (const l of r.all) console.log(`      ${l.split('\n')[0]}`)
  }
  summary.push(`${name}: ${bad}/${paths.length} pages with problems`)
  totalBad += bad
  await ctx.close()
}
await browser.close()
server?.close()
console.log(`\n${summary.join('\n')}`)
console.log(totalBad ? `\nFAIL: ${totalBad} page load(s) with hydration mismatches or errors.` : '\nPASS: every page hydrated cleanly.')
process.exit(totalBad ? 1 : 0)

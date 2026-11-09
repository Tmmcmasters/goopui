#!/usr/bin/env node
// Demo smoke + accessibility check for the website (apps/www): drives every demo on every
// component docs page, in both frameworks (/docs/components/<slug> and
// /react/docs/components/<slug>), and runs axe-core on each page.
//
// Like check-hydration.mjs it builds the site the way the deploy does (`nuxt generate`), serves
// .output/public like the Caddyfile, and loads each page fresh in headless Chromium. Per page:
// - waits for hydration and for every React island to paint;
// - per demo stage (`.playground .stage`, `.preview .stage`): checks it rendered something, then
//   exercises its interactive elements generically (click triggers and buttons, right-click
//   context-menu triggers, arrow keys on lists / menus / sliders / tabs / radios, typing into
//   inputs, toggling switches and checkboxes), presses Escape after anything that opened an
//   overlay, presses Drip, and presses the stage's replay ("Open again") button;
// - fails on any console error or uncaught page error (minus BENIGN below), on a stage that
//   renders nothing or whose island stays empty, and on an overlay still open after Escape;
// - desktop only: axe-core (WCAG 2.x A/AA + best practices) in dark, with the main demo's
//   overlay open, and in light. `serious` / `critical` violations fail; `moderate` / `minor`
//   are reported only.
// Pages run in parallel across a few browser contexts. Each page runs at desktop (1440px) and
// at a phone viewport (390px, touch: taps instead of clicks, no right-click).
//
// Usage:
//   pnpm check:demos                          # build + serve on :3043 + check every page
//   pnpm check:demos --no-build               # reuse the existing apps/www/.output/public
//   pnpm check:demos dialog select            # only these slugs (both frameworks)
//   BASE_URL=https://goop.timmcmasters.work pnpm check:demos   # a running site (no build)
// Env: BASE_URL, PORT (default 3043), CHROMIUM_PATH (default: playwright-core's own download),
// CONCURRENCY (parallel pages, default 4), MODES (comma list: desktop,mobile; default both),
// FW (vue,react; default both), NO_AXE=1, SHOTS (report.json + failure screenshots, default
// demo-report), VERBOSE=1 (every action and console line).

import { spawnSync } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
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
const PORT = Number(process.env.PORT ?? 3043)
const REMOTE = process.env.BASE_URL?.replace(/\/$/, '')
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4)
const MODES = (process.env.MODES ?? 'desktop,mobile').split(',').map((s) => s.trim()).filter(Boolean)
const FWS = (process.env.FW ?? 'vue,react').split(',').map((s) => s.trim()).filter(Boolean)
const AXE = !process.env.NO_AXE
const SHOTS = resolve(ROOT, process.env.SHOTS ?? 'demo-report')
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

/**
 * Console errors that aren't the demos' fault: [message pattern, why it's benign, pages it may
 * appear on (default: any)]. Keep this short and specific: anything else fails the page.
 */
const BENIGN = [
  // The header's star count fetches api.github.com (also routed to a stub below); a 403 is the
  // unauthenticated rate limit on a shared CI IP.
  [/api\.github\.com/, 'GitHub star count (rate limit)'],
  [/Failed to load resource: the server responded with a status of 403/, 'GitHub star count (rate limit, URL not in the message)'],
  // Radix's HoverCard.Trigger calls preventDefault() in onTouchStart, and React listens to
  // touchstart passively, so Chrome logs this on a tap (no effect; shadcn/ui's HoverCard does it
  // too). Only on the React HoverCard page.
  [/Unable to preventDefault inside passive event listener invocation/, 'Radix HoverCard touchstart (upstream)', /^\/react\/docs\/components\/hover-card$/],
]

/**
 * axe rules switched off, with the reason. Everything else in the tags below runs.
 */
const AXE_DISABLED = {}
/** Rules off only while the demo's overlay is open (the 'dark, demo open' scene). */
const AXE_DISABLED_OPEN = {
  // A modal (reka-ui / Radix) traps focus and hides the rest of the page from screen readers with
  // aria-hidden (the aria-hidden package), not `inert`; the hidden page's links can't be reached
  // while the trap holds, which axe can't see.
  'aria-hidden-focus': 'modal focus trap + aria-hidden on the page behind it',
}
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const AXE_FAIL = new Set(['serious', 'critical'])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------------------------
// Build
if (!REMOTE && !NO_BUILD) {
  console.log('Generating apps/www...')
  const r = spawnSync('pnpm', ['--filter', 'www', 'generate'], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
if (!REMOTE && !existsSync(PUBLIC)) {
  console.error(`No build at ${PUBLIC}. Run without --no-build.`)
  process.exit(2)
}

// ---------------------------------------------------------------------------------------------
// A static server with apps/www/Caddyfile's semantics (see check-hydration.mjs for the details):
// /path/ 308s to /path, try_files {path} {path}/index.html, missing -> /404.html (404).
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
function caddyLike(req, res) {
  const url = new URL(req.url, 'http://x')
  let path
  try {
    path = decodeURIComponent(url.pathname)
  } catch {
    path = url.pathname
  }
  const notFound = () => send(res, join(PUBLIC, '404.html'), 404)
  const m = /^(.+)\/$/.exec(url.pathname)
  if (m) {
    res.writeHead(308, { location: m[1] + url.search })
    return res.end()
  }
  if (kind(fsPath(path)) !== 'file' && kind(fsPath(`${path}/index.html`)) === 'file') return send(res, fsPath(`${path}/index.html`))
  const file = fsPath(path)
  if ((file !== PUBLIC && !file.startsWith(PUBLIC + sep)) || kind(file) !== 'file') return notFound()
  send(res, file)
}

let server
let BASE = REMOTE
if (!REMOTE) {
  server = createServer(caddyLike)
  await new Promise((ok, fail) => server.once('error', fail).listen(PORT, '127.0.0.1', ok))
  BASE = `http://127.0.0.1:${PORT}`
  console.log(`Serving ${relative(ROOT, PUBLIC)} at ${BASE}`)
}

// ---------------------------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

async function newContext(mode) {
  const mobile = mode === 'mobile'
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'no-preference',
    colorScheme: 'dark',
  })
  // Never hit the GitHub API from the check (rate limits, noise).
  await ctx.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"stargazers_count":4321}' }))
  // Sound off (no AudioContext autoplay warnings), and every page starts dark: the light axe pass
  // clicks the theme toggle, which stores 'light' in this shared context.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('goop-sound', 'off')
      localStorage.removeItem('goop-theme')
    } catch {}
  })
  return ctx
}

/** Component slugs: the built pages, or the /docs/components index links on a remote site. */
async function slugs() {
  if (only.length) return only
  if (!REMOTE) {
    const dir = join(PUBLIC, 'docs/components')
    return readdirSync(dir)
      .filter((n) => !n.startsWith('.') && !n.startsWith('_') && kind(join(dir, n, 'index.html')) === 'file')
      .sort()
  }
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`${BASE}/docs/components`, { waitUntil: 'domcontentloaded' })
  const hrefs = await page.$$eval('a[href*="/docs/components/"]', (as) => as.map((a) => new URL(a.href).pathname))
  await ctx.close()
  return [...new Set(hrefs.map((h) => h.replace(/\/+$/, '').split('/').pop()))].filter(Boolean).sort()
}

// ---------------------------------------------------------------------------------------------
// In-page helpers (run in the browser).

/** Wait for Nuxt to finish hydrating and every React island to paint. */
async function settle(page, path) {
  await page.waitForFunction(
    () => {
      const app = document.querySelector('#__nuxt')?.__vue_app__
      return !!app && app.config.globalProperties.$nuxt?.isHydrating === false
    },
    null,
    { timeout: 20000 },
  )
  if (path.startsWith('/react/')) {
    await page
      .waitForFunction(() => [...document.querySelectorAll('[data-react-island]')].every((el) => el.childNodes.length > 0), null, { timeout: 15000 })
      .catch(() => {})
    const empty = await page.$$eval('[data-react-island]', (els) => els.filter((el) => !el.childNodes.length).map((el) => el.dataset.demo))
    if (empty.length) return [`React island(s) never painted: ${empty.join(', ')}`]
  }
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  return []
}

/** Overlays that are open outside the demo stages (portaled content). */
const OPEN_OVERLAYS = () => {
  const sel = '[role=dialog],[role=alertdialog],[role=menu],[role=listbox],[role=tooltip],[data-state=open][data-slot$=content]'
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  return [...document.querySelectorAll(sel)]
    // A closing overlay (data-state="closed", still animating out) has closed: slow CI runners
    // can take a few seconds to finish a drawer's exit.
    .filter((el) => !el.closest('[data-state=closed]'))
    .filter((el) => !el.closest('.stage') && !el.closest('header') && !el.closest('[data-smoke-ignore]') && visible(el))
    .filter((el) => el.getAttribute('role') !== 'tooltip') // tooltips close on pointer leave, not Escape alone
    .map((el) => `${el.getAttribute('role') ?? el.dataset.slot}${el.getAttribute('aria-label') ? ` "${el.getAttribute('aria-label')}"` : ''}`)
}

/**
 * Mark a stage's interactive elements with data-smoke and say how to drive each. Returns
 * [{ id, kind, label }].
 */
const MARK = ([stageIndex, max]) => {
  const stage = document.querySelectorAll('.playground .stage, .preview .stage')[stageIndex]
  if (!stage) return { rendered: false, items: [] }
  const root = stage.querySelector('.demo') ?? stage
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0
  }
  // Something visible and not trivially small (a skeleton block counts; the replay button and
  // empty wrappers don't).
  const rendered = [...root.querySelectorAll('*')].some((el) => {
    if (el.closest('.replay') || !visible(el)) return false
    const r = el.getBoundingClientRect()
    return r.width * r.height >= 64 && (el.children.length === 0 || (el.innerText ?? '').trim().length > 0)
  })
  const sel = [
    'button',
    'a[href^="#"]',
    'input:not([type=hidden])',
    'textarea',
    '[contenteditable=true]',
    '[role=button]',
    '[role=switch]',
    '[role=checkbox]',
    '[role=radio]',
    '[role=tab]',
    '[role=slider]',
    '[role=combobox]',
    '[role=option]',
    '[role=menuitem]',
    '[aria-haspopup]',
    '[data-slot$=trigger]',
  ].join(',')
  const seen = new Set()
  const items = []
  for (const el of root.querySelectorAll(sel)) {
    // One item per control: an input inside a trigger etc. drives the outer one.
    const ctl = el
    if (seen.has(ctl)) continue
    seen.add(ctl)
    if (ctl.closest('.replay') || ctl.closest('[aria-hidden=true]') || ctl.matches(':disabled,[aria-disabled=true],[data-disabled]')) continue
    if (!visible(ctl)) continue
    const role = ctl.getAttribute('role')
    const tag = ctl.tagName.toLowerCase()
    const type = (ctl.getAttribute('type') ?? '').toLowerCase()
    let kind = 'click'
    if (ctl.matches('[data-slot=context-menu-trigger]')) kind = 'context'
    else if (role === 'slider' || type === 'range') kind = 'slider'
    else if (role === 'tab' || role === 'radio' || type === 'radio') kind = 'arrows'
    else if (role === 'combobox' && (tag === 'input' || ctl.isContentEditable)) kind = 'type'
    else if ((tag === 'input' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range'].includes(type)) || tag === 'textarea' || ctl.isContentEditable)
      kind = 'type'
    const id = `${stageIndex}-${items.length}`
    ctl.setAttribute('data-smoke', id)
    const label = (ctl.getAttribute('aria-label') || ctl.innerText || ctl.getAttribute('placeholder') || ctl.getAttribute('data-slot') || tag)
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 30)
    items.push({ id, kind, label: `${role ?? tag} "${label}"` })
    if (items.length >= max) break
  }
  return { rendered, items }
}

// ---------------------------------------------------------------------------------------------
const MAX_PER_STAGE = 12
const PAGE_TIMEOUT = Number(process.env.PAGE_TIMEOUT ?? 120000)
const STAGES = '.playground .stage, .preview .stage'

/** Close whatever an action opened; returns a problem string if an overlay stays open. */
async function closeOverlays(page, what) {
  let open = await page.evaluate(OPEN_OVERLAYS)
  if (!open.length) return null
  // Exercise the open list / menu with the keyboard, then close it.
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp']) await page.keyboard.press(key).catch(() => {})
  await page.keyboard.press('Escape')
  for (let t = 0; t < 20; t++) {
    await sleep(100)
    open = await page.evaluate(OPEN_OVERLAYS)
    if (!open.length) return null
  }
  // Recover so the rest of the page still runs: a second Escape, then a click on the body.
  await page.keyboard.press('Escape').catch(() => {})
  await page.mouse.click(5, 5).catch(() => {})
  return `${what}: overlay stuck open after Escape: ${open.join(', ')}`
}

async function act(page, item, mobile) {
  const loc = page.locator(`[data-smoke="${item.id}"]`)
  if (!(await loc.count())) return 'gone'
  await loc.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {})
  const press = async (...keys) => {
    for (const k of keys) await page.keyboard.press(k)
  }
  const tap = () => (mobile ? loc.tap({ timeout: 1500 }) : loc.click({ timeout: 1500 }))
  try {
    switch (item.kind) {
      case 'context':
        if (mobile) return 'skip'
        await loc.click({ button: 'right', timeout: 1500 })
        break
      case 'slider':
        await loc.focus()
        await press('ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home')
        break
      case 'arrows':
        await tap()
        await press('ArrowRight', 'ArrowLeft')
        break
      case 'type':
        await tap()
        await page.keyboard.type('1a', { delay: 20 })
        // Put the demo back as it was (an empty combobox / command list is not a demo state).
        await loc.fill('', { timeout: 1000 }).catch(() => {})
        await press('ArrowDown')
        break
      default:
        await tap()
    }
  } catch (e) {
    // Not actionable (covered, detached by a re-render, animating away): not a failure.
    return `skip (${e.message.split('\n')[0].slice(0, 80)})`
  }
  return 'ok'
}

async function runPage(ctx, path, mode) {
  const mobile = mode === 'mobile'
  const page = await ctx.newPage()
  const problems = []
  const notes = []
  const log = []
  const benign = (t) => BENIGN.some(([re, , where]) => re.test(t) && (!where || where.test(path)))
  page.on('console', (m) => {
    const text = m.text()
    log.push(`[${m.type()}] ${text}`)
    if (m.type() === 'error' && !benign(text)) problems.push(`console error: ${text.split('\n')[0].slice(0, 300)}`)
  })
  page.on('pageerror', (e) => {
    log.push(`[pageerror] ${e.message}`)
    if (!benign(e.message)) problems.push(`pageerror: ${e.message.split('\n')[0].slice(0, 300)}`)
  })
  let actions = 0
  let stageCount = 0
  const axe = { fail: [], report: [] }
  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 30000 })
    if (res && res.status() >= 400) problems.push(`HTTP ${res.status()}`)
    problems.push(...(await settle(page, path)))
    stageCount = await page.locator(STAGES).count()
    // A "Coming soon" page (no component yet) has no demo by design.
    const soon = await page.locator('h1', { hasText: 'Coming soon' }).count()
    if (!stageCount && !soon) problems.push('no demo stage on the page')
    if (soon) notes.push('coming soon: no demos')

    for (let s = 0; s < stageCount; s++) {
      const stage = page.locator(STAGES).nth(s)
      await stage.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
      await sleep(150)
      const { rendered, items } = await page.evaluate(MARK, [s, MAX_PER_STAGE])
      if (!rendered) problems.push(`stage ${s + 1}: rendered nothing`)
      for (const item of items) {
        if (process.env.TRACE) console.error(`  trace ${path} stage ${s + 1} ${item.kind} ${item.label}`)
        const r = await act(page, item, mobile)
        if (VERBOSE) notes.push(`stage ${s + 1} ${item.kind} ${item.label}: ${r}`)
        if (r !== 'ok') continue
        actions++
        await sleep(250)
        const stuck = await closeOverlays(page, `stage ${s + 1} ${item.label}`)
        if (stuck) problems.push(stuck)
        // A demo link that left the page (pagination, breadcrumb): come back, next stage.
        if (new URL(page.url()).pathname !== path) {
          notes.push(`stage ${s + 1} ${item.label} navigated to ${new URL(page.url()).pathname}`)
          await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
          await settle(page, path)
          break
        }
      }
      // Stage controls (Drip) and the replay button ("Open again").
      const frame = page.locator('.playground, .preview').nth(s)
      const drip = frame.getByRole('button', { name: 'Drip', exact: true })
      if (await drip.count()) {
        await (mobile ? drip.first().tap({ timeout: 1500 }) : drip.first().click({ timeout: 1500 })).catch(() => {})
        actions++
      }
      const replay = stage.locator(':scope > .replay')
      if (await replay.count()) {
        await stage.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
        // A long timeout: a demo can cover the page for a while (Page Transition's pour).
        await (mobile ? replay.tap({ timeout: 8000 }) : replay.click({ timeout: 8000 })).catch((e) => problems.push(`stage ${s + 1}: replay button: ${e.message.split('\n')[0]}`))
        actions++
        await sleep(700)
        const stuck = await closeOverlays(page, `stage ${s + 1} replay`)
        if (stuck) problems.push(stuck)
        await sleep(300)
        const { rendered: again } = await page.evaluate(MARK, [s, 0])
        if (!again) problems.push(`stage ${s + 1}: rendered nothing after replay`)
      }
    }

    if (AXE && !mobile) await runAxe(page, axe)
  } catch (e) {
    problems.push(`threw: ${e.message.split('\n')[0]}`)
  }
  if (problems.length || axe.fail.length) {
    mkdirSync(SHOTS, { recursive: true })
    await page
      .screenshot({ path: join(SHOTS, `${mode}${path.replaceAll('/', '_')}.png`), fullPage: false })
      .catch(() => {})
  }
  await page.close()
  return { path, mode, problems: [...new Set(problems)], notes, log, actions, stageCount, axe }
}

// ---------------------------------------------------------------------------------------------
// axe-core

/** Let closing overlays finish (their exit animations, the page's aria-hidden) before axe runs. */
async function quiesce(page) {
  for (let t = 0; t < 30; t++) {
    const busy =
      (await page.evaluate(OPEN_OVERLAYS)).length > 0 ||
      (await page.evaluate(() => !!document.querySelector('.site-header[aria-hidden=true], body > [data-aria-hidden=true]')))
    if (!busy) break
    if (t % 5 === 0) await page.keyboard.press('Escape').catch(() => {})
    await sleep(100)
  }
  await sleep(300)
}

async function axeRun(page, label, into, extraDisabled = {}) {
  await page.evaluate(AXE_SOURCE)
  const results = await page.evaluate(
    async ([tags, disabled]) => {
      const rules = Object.fromEntries(disabled.map((r) => [r, { enabled: false }]))
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, rules, resultTypes: ['violations'] })
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 300), inner: (() => { try { return document.querySelector(n.target[0])?.innerHTML.slice(0, 300) } catch { return undefined } })(), summary: (n.failureSummary ?? '').split('\n').slice(1, 3).join(' ').trim() })),
      }))
    },
    [AXE_TAGS, Object.keys({ ...AXE_DISABLED, ...extraDisabled })],
  )
  for (const v of results) {
    const entry = { ...v, scene: label }
    if (AXE_FAIL.has(v.impact)) into.fail.push(entry)
    else into.report.push(entry)
  }
}

async function runAxe(page, axe) {
  await page.keyboard.press('Escape').catch(() => {})
  await page.evaluate(() => window.scrollTo(0, 0))
  await quiesce(page)
  await axeRun(page, 'dark', axe)
  // The main demo with its overlay open: the replay button if it has one, else its first
  // popup trigger.
  const stage = page.locator(STAGES).first()
  if (await stage.count()) {
    const replay = stage.locator(':scope > .replay')
    const trigger = stage.locator('[aria-haspopup]:visible, [data-slot$=trigger]:not([data-slot=context-menu-trigger]):visible').first()
    let opened = false
    if (await replay.count()) opened = !!(await replay.click({ timeout: 1500 }).then(() => true, () => false))
    else if (await trigger.count()) opened = !!(await trigger.click({ timeout: 1500 }).then(() => true, () => false))
    if (opened) {
      await sleep(800)
      if ((await page.evaluate(OPEN_OVERLAYS)).length) await axeRun(page, 'dark, demo open', axe, AXE_DISABLED_OPEN)
      await page.keyboard.press('Escape').catch(() => {})
      await quiesce(page)
    }
  }
  const toLight = page.locator('button[aria-label="Switch to light theme"]:visible').first()
  if (await toLight.count()) {
    await toLight.click()
    await quiesce(page)
    await axeRun(page, 'light', axe)
  } else axe.report.push({ id: 'theme-toggle', impact: 'n/a', help: 'no theme toggle found; light theme not checked', nodes: [], scene: 'light' })
}

// ---------------------------------------------------------------------------------------------
const list = await slugs()
const tasks = []
for (const slug of list)
  for (const fw of FWS)
    for (const mode of MODES) tasks.push({ path: fw === 'react' ? `/react/docs/components/${slug}` : `/docs/components/${slug}`, mode })
console.log(`\n${list.length} components x ${FWS.join('+')} x ${MODES.join('+')} = ${tasks.length} page runs, ${CONCURRENCY} in parallel on ${BASE}\n`)

const started = Date.now()
const results = []
let next = 0
async function worker() {
  const ctxs = {}
  while (next < tasks.length) {
    const t = tasks[next++]
    ctxs[t.mode] ??= await newContext(t.mode)
    const t0 = Date.now()
    let r
    try {
      let timer
      r = await Promise.race([
        runPage(ctxs[t.mode], t.path, t.mode),
        new Promise((_, fail) => (timer = setTimeout(() => fail(new Error(`page run timed out after ${PAGE_TIMEOUT / 1000}s`)), PAGE_TIMEOUT))),
      ]).finally(() => clearTimeout(timer))
    } catch (e) {
      // A hung page: drop its context (and the page) so the next run starts clean.
      await ctxs[t.mode]?.close().catch(() => {})
      delete ctxs[t.mode]
      r = { ...t, problems: [`check crashed: ${e.message.split('\n')[0]}`], notes: [], log: [], actions: 0, stageCount: 0, axe: { fail: [], report: [] } }
    }
    r.ms = Date.now() - t0
    results.push(r)
    printResult(r)
  }
  for (const c of Object.values(ctxs)) await c.close()
}

function printResult(r) {
  const bad = r.problems.length || r.axe.fail.length
  const axeTxt = AXE && r.mode === 'desktop' ? ` axe: ${r.axe.fail.length} serious+, ${r.axe.report.length} moderate-` : ''
  console.log(
    `${bad ? 'FAIL' : 'ok  '} ${r.mode.padEnd(7)} ${r.path.padEnd(44)} ${String(r.stageCount).padStart(2)} stages ${String(r.actions).padStart(3)} actions${axeTxt}  ${(r.ms / 1000).toFixed(1)}s`,
  )
  for (const p of r.problems) console.log(`       ${p}`)
  for (const v of r.axe.fail) console.log(`       axe ${v.impact} ${v.id} [${v.scene}]: ${v.help}\n         ${v.nodes.slice(0, 4).map((n) => `${n.target}  (${n.summary.slice(0, 140)})`).join('\n         ')}`)
  if (VERBOSE) {
    for (const v of r.axe.report) console.log(`       axe ${v.impact} ${v.id} [${v.scene}]: ${v.help} (${v.nodes.length})`)
    for (const n of r.notes) console.log(`       . ${n}`)
    for (const l of r.log) console.log(`       > ${l.split('\n')[0].slice(0, 200)}`)
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker))
await browser.close()
server?.close()

// Summary: failing pages, and every axe rule hit across the run (grouped, with page counts).
const failed = results.filter((r) => r.problems.length || r.axe.fail.length)
const byRule = new Map()
for (const r of results)
  for (const v of [...r.axe.fail, ...r.axe.report]) {
    const k = `${v.impact} ${v.id}`
    const e = byRule.get(k) ?? { v, pages: new Set(), targets: new Set() }
    e.pages.add(r.path)
    for (const n of v.nodes) e.targets.add(n.target)
    byRule.set(k, e)
  }
if (byRule.size) {
  console.log('\naxe rules hit (impact rule: pages, sample targets):')
  for (const [k, e] of [...byRule].sort()) {
    console.log(`  ${AXE_FAIL.has(e.v.impact) ? 'FAIL' : 'note'} ${k}: ${e.pages.size} page(s). ${e.v.help}`)
    console.log(`       ${[...e.targets].slice(0, 5).join('\n       ')}`)
  }
}
mkdirSync(SHOTS, { recursive: true })
writeFileSync(join(SHOTS, 'report.json'), JSON.stringify(results.map(({ log, ...r }) => r), null, 1))
const off = [...Object.entries(AXE_DISABLED), ...Object.entries(AXE_DISABLED_OPEN).map(([k, v]) => [k, `with a demo overlay open: ${v}`])]
if (off.length) console.log(`\naxe rules disabled: ${off.map(([k, v]) => `${k} (${v})`).join('; ')}`)
console.log(`\n${results.length - failed.length}/${results.length} page runs clean in ${((Date.now() - started) / 1000).toFixed(0)}s.`)
if (failed.length) {
  console.log(`\nFAIL: ${failed.length} page run(s):`)
  for (const r of failed) console.log(`  ${r.mode.padEnd(7)} ${r.path}: ${r.problems.length} problem(s), ${r.axe.fail.length} serious/critical axe violation(s)`)
  console.log(`Screenshots: ${relative(ROOT, SHOTS)}/`)
} else console.log('\nPASS: every demo ran clean and no serious/critical axe violations.')
process.exit(failed.length ? 1 : 0)

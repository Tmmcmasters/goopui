#!/usr/bin/env node
// Edge-clip regression check: goo on screen must never be cut by the page-edge guard.
//
// The page-edge guard (packages/core/src/page-edge.ts) clips goo layers near the page's right
// and bottom edges so they never grow the scroll size (see check-overflow.mjs). It may only
// cut goo past that edge, never goo you can see. On a narrow viewport (390px by default) this
// loads each page, finds every goo host whose right edge sits near the viewport's right edge,
// freezes animation frames, screenshots the host's on-screen surroundings, then lifts every
// clip on the goo parts (overflow: visible) and screenshots the same frame again. Any pixel
// that differs is goo the guard cut on screen.
//
// Usage: start the app, then
//   node scripts/check-edge-clip.mjs                        # /, /button, /accordion against BASE_URL
//   BASE_URL=http://localhost:3045 node scripts/check-edge-clip.mjs / /docs/components/button
// Env: BASE_URL (default http://localhost:3000), CHROMIUM_PATH, WIDTH (default 390),
// NEAR (px from the right edge that counts as near, default 64), SHOT_DIR (save the crops).

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const WIDTH = Number(process.env.WIDTH ?? 390)
const NEAR = Number(process.env.NEAR ?? 64)
const SHOT_DIR = process.env.SHOT_DIR
const paths = process.argv.slice(2)
const PAGES = paths.length ? paths : ['/', '/button', '/accordion']
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true })

/** Lifts every clip on the goo parts: the unclipped reference. */
const UNCLIP = '[data-goop],[data-goop] *{overflow:visible!important;overflow-clip-margin:0px!important}'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** In-page: window.__edgeFreeze(true) holds every requestAnimationFrame callback (the goo
 *  stops on its current frame), false replays them. */
function freezer() {
  const raf = window.requestAnimationFrame.bind(window)
  let held = null
  window.requestAnimationFrame = (cb) => {
    if (!held) return raf(cb)
    held.push(cb)
    return 0
  }
  window.__edgeFreeze = (on) => {
    if (on) held ??= []
    else if (held) {
      const q = held
      held = null
      for (const cb of q) raf(cb)
    }
  }
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--force-prefers-reduced-motion=0'],
})
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: 844 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
})

/** Count differing pixels between two same-size PNG screenshots (decoded in a page). */
const diffPage = await ctx.newPage()
async function diff(a, b) {
  return diffPage.evaluate(
    async ([a, b]) => {
      const load = async (s) => {
        const img = new Image()
        img.src = `data:image/png;base64,${s}`
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const g = c.getContext('2d')
        g.drawImage(img, 0, 0)
        return g.getImageData(0, 0, c.width, c.height)
      }
      const [x, y] = [await load(a), await load(b)]
      if (x.width !== y.width || x.height !== y.height) return -1
      let n = 0
      for (let i = 0; i < x.data.length; i += 4) {
        const d = Math.max(
          Math.abs(x.data[i] - y.data[i]),
          Math.abs(x.data[i + 1] - y.data[i + 1]),
          Math.abs(x.data[i + 2] - y.data[i + 2]),
        )
        if (d > 24) n++
      }
      return n
    },
    [a.toString('base64'), b.toString('base64')],
  )
}

let failed = 0
let checked = 0
for (const path of PAGES) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  await sleep(2000)
  await page.evaluate(freezer)
  // Open closed accordion items so their goo rows are checked too.
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('[data-goop-accordion] button[aria-expanded="false"]')) b.click()
  })
  await sleep(800)
  const n = await page.evaluate(
    ([near]) => {
      const vw = document.documentElement.clientWidth
      let i = 0
      const hosts = new Set([...document.querySelectorAll('[data-goop="layer"]')].map((l) => l.parentElement))
      for (const h of hosts) {
        if (!h || h.closest('[data-goop-overlay],[data-goop-viewport]')) continue
        const r = h.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (getComputedStyle(h).visibility === 'hidden') continue
        if (r.right < vw - near || r.left > vw) continue
        h.setAttribute('data-edge-clip-check', String(i++))
      }
      return i
    },
    [NEAR],
  )
  for (let i = 0; i < n; i++) {
    const el = await page.$(`[data-edge-clip-check="${i}"]`)
    await el.scrollIntoViewIfNeeded()
    await sleep(150)
    const box = await el.boundingBox()
    if (!box) continue
    // Hover to wake the goo (drips, squish), then let the page-edge guard settle.
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2)
    await sleep(600)
    await page.evaluate(() => window.__edgeFreeze(true))
    await sleep(120)
    const b = await el.boundingBox()
    const vp = page.viewportSize()
    const pad = 40
    const x = Math.max(0, Math.floor(b.x - pad))
    const y = Math.max(0, Math.floor(b.y - pad))
    const clip = { x, y, width: vp.width - x, height: Math.min(vp.height, Math.ceil(b.y + b.height + pad * 2)) - y }
    if (clip.width <= 0 || clip.height <= 0) continue
    const shot = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' })
    const style = await page.addStyleTag({ content: UNCLIP })
    const ref = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' })
    await style.evaluate((s) => s.remove())
    await page.evaluate(() => window.__edgeFreeze(false))
    const label = await el.evaluate((h) => (h.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24) || h.tagName)
    const d = await diff(shot, ref)
    checked++
    const bad = d !== 0
    if (bad) failed++
    console.log(`${path.padEnd(12)} ${bad ? 'CLIPPED' : 'ok     '} ${JSON.stringify(label)} ${bad ? `${d} px differ` : ''}`)
    if (SHOT_DIR) {
      const base = `${path.replace(/\W+/g, '_') || 'root'}-${i}`
      writeFileSync(join(SHOT_DIR, `${base}.png`), shot)
      writeFileSync(join(SHOT_DIR, `${base}-ref.png`), ref)
    }
  }
  await page.close()
}
await browser.close()
console.log(
  failed ? `\n${failed} of ${checked} host(s) had on-screen goo cut.` : `\n${checked} host(s) near the right edge: no on-screen goo cut.`,
)
process.exit(failed ? 1 : checked ? 0 : 2)

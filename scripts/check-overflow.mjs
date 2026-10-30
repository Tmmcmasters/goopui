#!/usr/bin/env node
// Overflow regression check: goo must never grow the page's scroll size.
//
// Drives every playground page (and every component pinned to the bottom-right corner of a
// short page, /edge?c=...) in headless Chromium, fires each component's effects (slow and
// fast hover swipes, clicks, rapid hits, open/close, drags) and samples
// document.documentElement.scrollWidth/scrollHeight every animation frame. The baseline is
// the same page with every goo part hidden. Any growth above it fails the check.
//
// Usage: start the playground (`pnpm dev:playground`), then
//   pnpm check:overflow                       # all cases against http://localhost:3000
//   BASE_URL=http://localhost:3039 pnpm check:overflow
//   pnpm check:overflow edge:button switch    # only these cases (page name or edge:<name>)
//   pnpm check:overflow edge                  # every edge case (or `pages`: every page)
// Env: BASE_URL, CHROMIUM_PATH (a Chromium/headless-shell binary; default: playwright-core's
// own download), VERBOSE=1 (print the goo parts that stuck out at the worst frame).

import { chromium } from 'playwright-core'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const VERBOSE = !!process.env.VERBOSE

const COMPONENTS = [
  'button', 'spinner', 'switch', 'checkbox', 'radio-group', 'popover', 'dropdown', 'select', 'tabs',
  'tooltip', 'slider', 'progress', 'toast', 'dialog', 'sheet', 'drawer', 'accordion', 'input', 'toggle',
]
/** Things that only open something on click: click once to open, Escape to close. */
const OPENERS = new Set(['popover', 'dropdown', 'select', 'dialog', 'sheet', 'drawer'])

const ALL = [...COMPONENTS.map((c) => `edge:${c}`), ...COMPONENTS]
const only = process.argv.slice(2)
const pick = (c) => only.includes(c) || (c.startsWith('edge:') ? only.includes('edge') : only.includes('pages'))
const cases = only.length ? ALL.filter(pick) : ALL
if (cases.length === 0) {
  console.error(`No matching cases. Known: ${ALL.join(' ')}`)
  process.exit(2)
}

/** Every goo part that can stick out of its component. Hidden to take the baseline. */
const GOO = '[data-goop="layer"],[data-goop="surface"],[data-goop="highlight"],[data-goop-overlay],[data-goop-viewport]'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--force-prefers-reduced-motion=0'],
})
const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 }, reducedMotion: 'no-preference' })

/** In-page: start sampling the scroll size every frame. */
function startSampler() {
  const de = document.documentElement
  const s = (window.__ov = { w: 0, h: 0, frames: 0, worst: null, run: true })
  const tick = () => {
    if (!s.run) return
    const w = de.scrollWidth
    const h = de.scrollHeight
    s.frames++
    if (w > s.w || h > s.h) {
      s.w = Math.max(s.w, w)
      s.h = Math.max(s.h, h)
      // Remember what stuck out at the worst frame (for VERBOSE).
      const vw = de.clientWidth + scrollX
      const vh = de.clientHeight + scrollY
      const out = []
      for (const el of document.querySelectorAll('[data-goop], [data-goop-overlay]')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        if (r.right + scrollX > vw + 0.5 || r.bottom + scrollY > vh + 0.5) {
          const host = el.closest('[data-goop-host],[data-slot]')
          const layer = el.closest('[data-goop="layer"]')
          const clip = layer ? ` layer overflow ${layer.style.overflowX || 'visible'}/${layer.style.overflowY || 'visible'}` : ''
          out.push(`${el.getAttribute('data-goop') ?? 'overlay'} in ${host?.getAttribute('data-slot') ?? host?.getAttribute('data-goop-host') ?? el.parentElement?.tagName} (r=${Math.round(r.right)} b=${Math.round(r.bottom)}${clip})`)
        }
      }
      s.worst = out.slice(0, 6)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/** In-page: scroll size with every goo part hidden. */
function baseline(sel) {
  const st = document.createElement('style')
  st.textContent = `${sel}{display:none!important}`
  document.head.append(st)
  const de = document.documentElement
  const out = { w: de.scrollWidth, h: de.scrollHeight, cw: de.clientWidth, ch: de.clientHeight }
  st.remove()
  return out
}

async function swipe(page, box, dir, steps) {
  const { x, y, width: w, height: h } = box
  const cx = x + w / 2
  const cy = y + h / 2
  const pad = 40
  const path = {
    lr: [[x - pad, cy], [x + w + pad, cy]],
    rl: [[x + w + pad, cy], [x - pad, cy]],
    tb: [[cx, y - pad], [cx, y + h + pad]],
    bt: [[cx, y + h + pad], [cx, y - pad]],
  }[dir]
  await page.mouse.move(path[0][0], path[0][1])
  await page.mouse.move(path[1][0], path[1][1], { steps })
}

async function exercise(page, el, kind) {
  const box = await el.boundingBox()
  if (!box) return
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // Slow and fast hover swipes in every direction (fast ones fire the hit shockwave).
  for (const dir of ['lr', 'rl', 'tb', 'bt']) {
    await swipe(page, box, dir, 24)
    await sleep(150)
    await swipe(page, box, dir, 3)
    await sleep(250)
  }
  await sleep(500)
  if (kind === 'opener') {
    for (let i = 0; i < 2; i++) {
      await page.mouse.click(cx, cy)
      await sleep(1300)
      await page.keyboard.press('Escape')
      await sleep(1300)
    }
    return
  }
  if (kind === 'slider') {
    // Drag the thumb hard both ways.
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width + 30, cy, { steps: 4 })
    await page.mouse.move(box.x - 30, cy, { steps: 4 })
    await page.mouse.move(box.x + box.width + 60, cy, { steps: 3 })
    await page.mouse.up()
    await sleep(800)
  }
  // Click, then a burst of fast hits.
  await page.mouse.click(cx, cy)
  await sleep(700)
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(cx + (i % 2 ? 6 : -6), cy, { delay: 20 })
    await sleep(60)
  }
  if (kind === 'input') await page.keyboard.type('goop goop goop', { delay: 30 })
  await sleep(600)
  await page.keyboard.press('Escape')
}

async function drawerFling(page) {
  // Open, then fling the panel down off the screen (fires the dismiss splash).
  const panel = await page.$('[data-goop-drawer]')
  if (!panel) return
  const b = await panel.boundingBox()
  if (!b) return
  const x = b.x + b.width / 2
  const y = b.y + 20
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 300, { steps: 3 })
  await page.mouse.up()
  await sleep(1500)
}

async function runCase(name) {
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const edge = name.startsWith('edge:')
  const comp = edge ? name.slice(5) : name
  const url = edge ? `${BASE}/edge?c=${comp}` : `${BASE}/${comp}`
  await page.goto(url, { waitUntil: 'load' })
  await sleep(1200)
  const base = await page.evaluate(baseline, GOO)
  await page.evaluate(startSampler)

  if (edge) {
    const el = await page.$('[data-edge-target]')
    if (!el) throw new Error(`${name}: no [data-edge-target]`)
    const kind = OPENERS.has(comp) ? 'opener' : comp === 'slider' ? 'slider' : comp === 'input' ? 'input' : 'plain'
    await exercise(page, el, kind)
    if (comp === 'drawer') {
      await el.click()
      await sleep(1000)
      await drawerFling(page)
    }
    if (comp === 'toast') {
      for (let i = 0; i < 4; i++) {
        await el.click()
        await sleep(200)
      }
      await sleep(5500) // let them time out and drip away
    }
  } else {
    // Every goo host in the page's goop column (first 8).
    const hosts = await page.$$('main [data-goop-host], main [data-goop-tabs], main [data-goop-accordion] button, main button:has([data-goop="layer"])')
    const seen = new Set()
    let n = 0
    for (const h of hosts) {
      const id = await h.evaluate((e) => {
        e.__ovid ??= Math.random().toString(36).slice(2)
        return e.__ovid
      })
      if (seen.has(id)) continue
      seen.add(id)
      if (!(await h.isVisible())) continue
      const kind = (await h.getAttribute('aria-haspopup')) || (await h.getAttribute('aria-expanded')) !== null ? 'opener' : 'plain'
      await exercise(page, h, (await h.getAttribute('data-goop-host')) === 'slider' ? 'slider' : kind)
      if (++n >= 8) break
    }
  }
  await sleep(1500) // falling drips land / fade
  const res = await page.evaluate(() => {
    window.__ov.run = false
    return window.__ov
  })
  await page.close()
  return { name, base, res, errors }
}

let failed = 0
const rows = []
for (const name of cases) {
  let r
  try {
    r = await runCase(name)
  } catch (e) {
    console.log(`${name.padEnd(18)} ERROR ${e.message.split('\n')[0]}`)
    failed++
    continue
  }
  const dw = Math.max(0, r.res.w - r.base.w)
  const dh = Math.max(0, r.res.h - r.base.h)
  const bad = dw > 0 || dh > 0
  if (bad) failed++
  rows.push({ name, dw, dh })
  console.log(
    `${name.padEnd(18)} ${bad ? 'GROWS' : 'ok   '} +${dw}px wide, +${dh}px tall` +
      `  (base ${r.base.w}x${r.base.h}, ${r.res.frames} frames)` +
      (r.errors.length ? `  [page errors: ${r.errors.length}]` : ''),
  )
  if (bad && VERBOSE && r.res.worst?.length) console.log(`    ${r.res.worst.join('\n    ')}`)
}
await browser.close()
console.log(failed ? `\n${failed} case(s) grew the page.` : '\nNo goo grew the page.')
process.exit(failed ? 1 : 0)

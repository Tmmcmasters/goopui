// Puddle brand, step 1 and 3 (see brand/puddle/README in index.html):
//
//   node brand/tools/puddle.mjs capture   -> brand/puddle/rest-capture.png (engine resting pose, 10x)
//   uv run --with numpy --with scikit-image --with shapely --with fonttools --with pillow --with scipy \
//     python brand/tools/puddle.py         -> brand/puddle/*.svg + index.html (traced from rest-capture.png)
//   node brand/tools/puddle.mjs raster    -> apps/soon/public/og.png + apple-touch-icon.png
//
// The mark is not drawn by hand: it is the live goop engine's resting pose (core's SVG renderer,
// reduced motion = static) at the PUDDLE geometry below, traced to Beziers. So the static mark,
// the favicon and the live header logo (apps/soon/app/components/GoopLogo.vue, same numbers)
// are the same shape. Needs `pnpm build` (packages/core/dist) and playwright-core resolvable
// from PW (a folder whose node_modules has it, default: cwd) and a Chromium (CHROME = its executable).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { createRequire } from 'node:module'

const { chromium } = createRequire(join(process.env.PW || process.cwd(), 'noop.js'))('playwright-core')
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const out = join(root, 'brand', 'puddle')

/** Host box + engine options. Keep in sync with GoopLogo.vue (DESIGN). */
const PUDDLE = {
  width: 52,
  height: 38,
  options: {
    drips: false,
    dripSize: 6.5,
    dripLength: 14,
    // Low softness keeps the lumps and satellites distinct (a high one melts them round).
    softness: 3,
    edge: 0.45,
    // Resting drips build the splat. Negative length = the bulb rides up inside the body, so
    // its edge pokes out as a lobe; length 0 at a corner = a lone droplet off the edge.
    restingDrips: [
      { x: 0.4, size: 1.8, length: -0.9 }, // bottom bulge
      { x: 0.66, size: 1.2, length: -0.2 }, // bottom-right lump
      { x: 0.7, size: 1.2, length: -5.5 }, // top-right lobe
      { x: 0.28, size: 0.9, length: -5.6 }, // top-left lobe
      { x: 1, size: 0.9, length: 0 }, // lead droplet (right)
      { x: 0, size: 0.72, length: 0 }, // speck (left)
    ],
  },
}
const PAD = 10
const SCALE = 10

const exe =
  process.env.CHROME ||
  os.homedir() + '/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const browser = await chromium.launch({ executablePath: exe })
const mode = process.argv[2]

if (mode === 'capture') {
  const core = readFileSync(join(root, 'packages', 'core', 'dist', 'index.mjs'), 'utf8')
  const page = await browser.newPage({
    viewport: { width: PUDDLE.width + PAD * 2, height: PUDDLE.height + PAD * 2 },
    deviceScaleFactor: SCALE,
  })
  await page.route('http://puddle.local/**', (r) =>
    r.request().url().endsWith('/core.mjs')
      ? r.fulfill({ contentType: 'text/javascript', body: core })
      : r.fulfill({
          contentType: 'text/html',
          body: `<!doctype html><style>html,body{margin:0;background:#fff}#b{position:absolute;left:${PAD}px;top:${PAD}px;width:${PUDDLE.width}px;height:${PUDDLE.height}px;border-radius:50%;color:#000}</style><span id=b></span>
<script type=module>import { attachGoop } from './core.mjs'
window.h = attachGoop(document.getElementById('b'), { renderer: 'svg', reducedMotion: true, ...${JSON.stringify(PUDDLE.options)} })</script>`,
        }),
  )
  await page.goto('http://puddle.local/')
  await page.waitForFunction(() => window.h)
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, 'rest-capture.png') })
  writeFileSync(join(out, 'rest-capture.json'), JSON.stringify({ pad: PAD, scale: SCALE, ...PUDDLE }))
  console.log('wrote brand/puddle/rest-capture.png')
} else if (mode === 'raster') {
  const pub = join(root, 'apps', 'soon', 'public')
  const lockup = readFileSync(join(out, 'lockup.svg'), 'utf8')
  const mark = readFileSync(join(out, 'mark.svg'), 'utf8')
  const fonts = join(root, 'apps', 'soon', 'node_modules', '@fontsource-variable')
  const dyna = readFileSync(join(fonts, 'dynapuff', 'files', 'dynapuff-latin-standard-normal.woff2')).toString('base64')
  const geist = readFileSync(join(fonts, 'geist', 'files', 'geist-latin-wght-normal.woff2')).toString('base64')
  const css = `@font-face{font-family:D;src:url(data:font/woff2;base64,${dyna}) format('woff2');font-weight:100 900;font-stretch:75% 125%}
@font-face{font-family:G;src:url(data:font/woff2;base64,${geist}) format('woff2');font-weight:100 900}
html,body{margin:0}`
  // og.png: 1200x630
  let page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><style>${css}
body{width:1200px;height:630px;background:#faf8f3;color:#2a2622;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;font-family:G}
.l svg{height:120px;width:auto;display:block}
h1{font-family:D;font-weight:600;font-size:92px;line-height:1;margin:56px 0 0;letter-spacing:-0.01em}
p{margin:34px 0 0;display:inline-flex;align-items:center;gap:12px;background:#1fa64a;color:#0b2414;border-radius:999px;padding:10px 24px;font-size:26px;font-weight:500}
p i{width:10px;height:10px;border-radius:50%;background:#0b2414}</style>
<div class=l>${lockup}</div><h1>Components that drip.</h1><p><i></i>Coming soon</p>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(pub, 'og.png') })
  await page.close()
  // apple-touch-icon.png: 180x180, opaque (iOS adds its own corner mask).
  page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><style>html,body{margin:0}body{width:180px;height:180px;background:#faf8f3;display:grid;place-items:center}svg{width:128px;height:auto;display:block}</style>${mark}`)
  await page.screenshot({ path: join(pub, 'apple-touch-icon.png') })
  console.log('wrote apps/soon/public/og.png + apple-touch-icon.png')
}
await browser.close()

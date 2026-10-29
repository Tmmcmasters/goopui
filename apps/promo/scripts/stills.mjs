// Render review stills at key moments (bundles once).
//   node scripts/stills.mjs                 default key moments
//   node scripts/stills.mjs 2.5 9.5 12      times in seconds
//   node scripts/stills.mjs --check 9.6     render twice (cold, then after other frames) and compare bytes
import { bundle } from '@remotion/bundler'
import { openBrowser, renderFrames, renderStill, selectComposition } from '@remotion/renderer'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PORT = Number(process.env.PORT ?? 3417)
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const out = path.join(root, 'out', process.env.OUT ?? 'stills')
await mkdir(out, { recursive: true })

const args = process.argv.slice(2)
const check = args[0] === '--check'
const times = (check ? args.slice(1) : args).map(Number).filter(Number.isFinite)
const keyTimes = times.length ? times : [0, 1.2, 2.2, 3.3, 4.8, 5.9, 6.6, 7.5, 9.55, 9.75, 10.0, 10.4, 10.9, 11.9, 12.7, 13.6, 14.9]

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') })
const inputProps = { trace: true, ...(process.env.PROPS ? JSON.parse(process.env.PROPS) : {}) }
// CHROME_MODE=chrome-for-testing when the headless shell never fires requestAnimationFrame.
const chromeMode = process.env.CHROME_MODE ?? 'headless-shell'
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' }, chromeMode })
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? 'GoopPromo', inputProps, puppeteerInstance: browser, port: PORT })
const common = {
  puppeteerInstance: browser,
  port: PORT,
  serveUrl,
  composition,
  inputProps,
  scale: 2.25,
  chromiumOptions: { gl: 'angle' },
  chromeMode,
  timeoutInMilliseconds: 120_000,
  onBrowserLog: (l) => {
    if (l.text.startsWith('[goo]') || l.type === 'error') console.log('  ', l.text)
  },
}

const frameOf = (t) => Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps))

if (check) {
  // Cold: one fresh page renders only frame f. Warm: one page renders a run of frames in
  // order (like a render tab does) ending past f. Frame f must come out byte-identical.
  const f = frameOf(keyTimes[0] ?? 9.6)
  const a = path.join(out, `check-cold-${f}.png`)
  await renderStill({ ...common, frame: f, output: a })
  const dir = path.join(out, 'check-seq')
  await mkdir(dir, { recursive: true })
  await renderFrames({
    ...common,
    outputDir: dir,
    imageFormat: 'png',
    frameRange: [Math.max(0, f - 6), f + 2],
    concurrency: 1,
    onStart: () => {},
    onFrameUpdate: () => {},
  })
  const { readdir } = await import('node:fs/promises')
  const files = (await readdir(dir)).filter((n) => n.endsWith('.png') && !n.startsWith('._')).sort()
  const b = path.join(dir, files.find((n) => Number(n.match(/(\d+)\.png$/)?.[1]) === f))
  const [ba, bb] = await Promise.all([readFile(a), readFile(b)])
  console.log(`frame ${f}: cold vs in-sequence ${ba.equals(bb) ? 'IDENTICAL' : 'DIFFERENT'} (${ba.length} / ${bb.length} bytes)`)
} else {
  for (const t of keyTimes) {
    const f = frameOf(t)
    const file = path.join(out, `t${t.toFixed(2).padStart(5, '0')}-f${f}.png`)
    const t0 = Date.now()
    await renderStill({ ...common, frame: f, output: file })
    console.log(`${file}  (${Date.now() - t0} ms)`)
  }
}
await browser.close({ silent: true })

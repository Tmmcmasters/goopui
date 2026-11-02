// Render a composition to H.264 with the renderer API (same path as stills.mjs, which loads
// reliably where the CLI's root-component load can time out on this machine).
//   node scripts/render.mjs <CompositionId> <out.mp4> [scale]
import { bundle } from '@remotion/bundler'
import { openBrowser, renderMedia, selectComposition } from '@remotion/renderer'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const [id = 'LaunchClip', outArg = 'out/goopui-launch.mp4', scaleArg = '3'] = process.argv.slice(2)
const PORT = Number(process.env.PORT ?? 3417)
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') })
const chromeMode = process.env.CHROME_MODE ?? 'chrome-for-testing'
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' }, chromeMode })
const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, port: PORT })
let last = -1
await renderMedia({
  serveUrl,
  composition,
  puppeteerInstance: browser,
  port: PORT,
  chromeMode,
  chromiumOptions: { gl: 'angle' },
  scale: Number(scaleArg),
  codec: 'h264',
  pixelFormat: 'yuv420p',
  crf: 16,
  imageFormat: 'jpeg',
  jpegQuality: 95,
  concurrency: Number(process.env.CONCURRENCY ?? 4),
  timeoutInMilliseconds: 120_000,
  outputLocation: path.resolve(root, outArg),
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10)
    if (p !== last) console.log(`${p * 10}%`)
    last = p
  },
})
await browser.close({ silent: true })
console.log(path.resolve(root, outArg))

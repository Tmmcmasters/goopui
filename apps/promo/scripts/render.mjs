// Render a composition to H.264 with the renderer API (same path as stills.mjs, which loads
// reliably where the CLI's root-component load can time out on this machine).
//   node scripts/render.mjs <CompositionId> <out.mp4> [scale]
//
// Frames are rendered to JPEGs, checked, repaired, then encoded with Remotion's bundled ffmpeg.
// Why the check: at 3x with four GPU tabs, Chrome now and then hands back a corrupt capture (the
// LaunchClip's drawer open had one: frame 208 came out as the caption tiled 3 x 3 with the drawer
// and cursor gone, a one-frame flash that read as a stutter). It is a compositor glitch, not
// the scene (the same frame renders cleanly on its own), so it can't be fixed in the scene.
// Every frame is a pure function of its number, so a frame that disagrees with both neighbours
// far more than they disagree with each other is re-rendered alone and swapped in.
import { bundle } from '@remotion/bundler'
import { openBrowser, renderFrames, renderStill, selectComposition } from '@remotion/renderer'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const [id = 'LaunchClip', outArg = 'out/goopui-launch.mp4', scaleArg = '3'] = process.argv.slice(2)
const PORT = Number(process.env.PORT ?? 3417)
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outFile = path.resolve(root, outArg)

/** Remotion's own ffmpeg (ships with the renderer; has libx264). */
function ffmpegBin() {
  const req = createRequire(import.meta.url)
  try {
    const dir = path.dirname(req.resolve(`@remotion/compositor-${process.platform}-${process.arch}/package.json`))
    const bin = path.join(dir, 'ffmpeg')
    if (existsSync(bin)) return { bin, env: { ...process.env, DYLD_LIBRARY_PATH: dir, LD_LIBRARY_PATH: dir } }
  } catch {}
  return { bin: 'ffmpeg', env: process.env }
}
const FF = ffmpegBin()
const ff = (args, binary = false) => {
  const r = spawnSync(FF.bin, ['-v', 'error', '-y', ...args], { env: FF.env, maxBuffer: 1 << 30, encoding: binary ? 'buffer' : 'utf8' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`)
  return r.stdout
}

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') })
const chromeMode = process.env.CHROME_MODE ?? 'chrome-for-testing'
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' }, chromeMode })
const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, port: PORT })
const common = {
  serveUrl,
  composition,
  puppeteerInstance: browser,
  port: PORT,
  chromeMode,
  chromiumOptions: { gl: 'angle' },
  scale: Number(scaleArg),
  jpegQuality: 95,
  timeoutInMilliseconds: 120_000,
}

const dir = await mkdtemp(path.join(tmpdir(), `promo-${id}-`))
try {
  let last = -1
  await renderFrames({
    ...common,
    outputDir: dir,
    imageFormat: 'jpeg',
    concurrency: Number(process.env.CONCURRENCY ?? 4),
    onStart: () => {},
    onFrameUpdate: (done) => {
      const p = Math.floor((done / composition.durationInFrames) * 10)
      if (p !== last) console.log(`${p * 10}%`)
      last = p
    },
  })
  const files = (await readdir(dir)).filter((n) => /^element-\d+\.jpeg$/.test(n)).sort()
  if (files.length !== composition.durationInFrames) throw new Error(`expected ${composition.durationInFrames} frames, got ${files.length}`)
  const digits = files[0].match(/\d+/)[0].length
  const frameFile = (f) => path.join(dir, `element-${String(f).padStart(digits, '0')}.jpeg`)
  const pattern = path.join(dir, `element-%0${digits}d.jpeg`)

  // Small grey thumbnails of every frame, for the neighbour check.
  const TW = 160
  const TH = Math.round((TW * composition.height) / composition.width)
  const N = TW * TH
  const thumbs = (input) => ff([...input, '-vf', `scale=${TW}:${TH}`, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'gray', '-'], true)
  const diff = (a, ai, b, bi) => {
    let s = 0
    for (let k = 0; k < N; k++) s += Math.abs(a[ai * N + k] - b[bi * N + k])
    return s / N
  }
  /** Frames far from both neighbours while the neighbours are close to each other. */
  const suspects = (buf) => {
    const out = []
    for (let f = 1; f < buf.length / N - 1; f++) {
      const a = diff(buf, f - 1, buf, f)
      const b = diff(buf, f, buf, f + 1)
      const c = diff(buf, f - 1, buf, f + 1)
      if (a > 1 && b > 1 && a + b > 3 * Math.max(0.3, c)) out.push(f)
    }
    return out
  }

  let all = thumbs(['-framerate', String(composition.fps), '-start_number', '0', '-i', pattern])
  const bad = suspects(all)
  for (const f of bad) {
    let fixed = false
    let genuine = false
    for (let attempt = 0; attempt < 3 && !fixed; attempt++) {
      const before = thumbs(['-i', frameFile(f)])
      await renderStill({ ...common, frame: f, output: frameFile(f), imageFormat: 'jpeg', overwrite: true })
      const now = thumbs(['-i', frameFile(f)])
      // Re-check against the neighbours; an unchanged re-render means the frame is genuine
      // (e.g. the sharp turn at a spring's apex).
      all = Buffer.concat([all.subarray(0, f * N), now, all.subarray((f + 1) * N)])
      genuine = diff(before, 0, now, 0) < 0.5
      fixed = genuine || !suspects(all.subarray((f - 1) * N, (f + 2) * N)).length
    }
    console.log(`frame ${f}: ${genuine ? 'suspect, but re-renders identically (kept)' : fixed ? 'corrupt capture replaced' : 'still odd after 3 re-renders'}`)
  }
  if (!bad.length) console.log('frames verified: no corrupt captures')

  await mkdir(path.dirname(outFile), { recursive: true })
  ff([
    '-framerate', String(composition.fps), '-start_number', '0', '-i', pattern,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', '-an', outFile,
  ])
} finally {
  await rm(dir, { recursive: true, force: true })
  await browser.close({ silent: true })
}
console.log(outFile)

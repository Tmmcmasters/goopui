// Tiny zero-dependency static server for the vanilla demo.
// Serves packages/core/ so the demo can import ../dist/index.mjs.
// Usage: node demo/serve.mjs [port]   (or `pnpm --filter @goopui/core demo`)
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
}

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
    if (path === '/') {
      res.writeHead(302, { location: '/demo/' }).end()
      return
    }
    let file = normalize(join(root, path))
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end()
      return
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(port, () => {
  console.log(`goopUI core demo: http://localhost:${port}/demo/`)
})

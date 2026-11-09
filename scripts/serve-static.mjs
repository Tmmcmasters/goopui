#!/usr/bin/env node
// Minimal static file server for the registry check (scripts/check-registry.sh): serves <dir>
// on <port> like the site's Caddy does (path, then path/index.html), with JSON as
// application/json and CORS open, so the shadcn CLIs see what they'd see in production.
// Usage: node scripts/serve-static.mjs <dir> <port>
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const [dir, port] = process.argv.slice(2)
if (!dir || !port) {
  console.error('usage: serve-static.mjs <dir> <port>')
  process.exit(2)
}
const root = resolve(dir)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const file = (p) => {
  try {
    return statSync(p).isFile() ? p : null
  } catch {
    return null
  }
}

createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
  const abs = join(root, path)
  const hit = abs.startsWith(root) && (file(abs) || file(join(abs, 'index.html')) || file(`${abs}.html`))
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (!hit) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found')
    return
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(hit)] ?? 'application/octet-stream' })
  createReadStream(hit).pipe(res)
}).listen(Number(port), () => console.log(`serving ${root} on http://localhost:${port}`))

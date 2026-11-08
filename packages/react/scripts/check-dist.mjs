// Post-build checks for @goopui/react's dist (run by `build` / `prepare`):
//   - every module whose source starts with 'use client' still starts with it in dist, so
//     Next.js App Router treats each component file as a client boundary (bundlers drop
//     module-level directives unless told to keep them);
//   - goop.css is copied verbatim (it is a Tailwind v4 source file with `@source`).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const src = new URL('../src/', import.meta.url).pathname
const dist = new URL('../dist/', import.meta.url).pathname
let failed = 0
const fail = (m) => {
  console.error(`[check-dist] ${m}`)
  failed++
}

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    if (f.startsWith('._')) return []
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

let clients = 0
for (const file of walk(src)) {
  if (!/\.(ts|tsx)$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  if (!/^\s*['"]use client['"]/.test(text)) continue
  clients++
  const out = join(dist, relative(src, file).replace(/\.tsx?$/, '.mjs'))
  if (!existsSync(out)) {
    fail(`missing ${relative(dist, out)} (from ${relative(src, file)})`)
    continue
  }
  if (!/^\s*['"]use client['"]/.test(readFileSync(out, 'utf8'))) fail(`'use client' dropped from ${relative(dist, out)}`)
}
if (!existsSync(join(dist, 'goop.css'))) fail('dist/goop.css missing')
else if (readFileSync(join(dist, 'goop.css'), 'utf8') !== readFileSync(join(src, 'goop.css'), 'utf8')) fail('dist/goop.css differs from src')

if (failed) process.exit(1)
console.log(`[check-dist] ok: ${clients} client modules keep 'use client', goop.css copied`)

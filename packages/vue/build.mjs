// Build @goopui/vue with mkdist: file-to-file transpile, .vue SFCs kept as SFCs (script
// lang=ts -> js via vue-sfc-transformer), declarations for .ts and .vue (vue-tsc).
//
// Why a script instead of the CLI:
//   - `!**/._*`: this repo lives on exFAT, where macOS writes AppleDouble `._*` files next to
//     every source file; mkdist would try to transpile them.
//   - no `postcss` loader: goop.css ships verbatim (comments kept, nothing minified), since
//     it is a Tailwind v4 source file (`@source`), not finished CSS.
//   - a hard failure when any declaration is missing or empty: mkdist + vue-tsc silently emit
//     an empty .vue.d.ts when a public type can't be named (see check below).
import { readFileSync } from 'node:fs'
import { mkdist } from 'mkdist'

const { errors, writtenFiles } = await mkdist({
  srcDir: 'src',
  distDir: 'dist',
  pattern: ['**', '!**/._*'],
  loaders: ['js', 'vue'],
  format: 'esm',
  ext: 'mjs',
  declaration: true,
})

const fail = (msg) => {
  console.error(`[build] ${msg}`)
  process.exitCode = 1
}
for (const { filename, errors: errs } of errors) for (const e of errs) fail(`${filename}: ${e.message}`)

// Every SFC must ship a non-empty declaration, or consumers silently get `any` components.
for (const file of writtenFiles.filter((f) => f.endsWith('.vue'))) {
  const dts = `${file}.d.ts`
  let text = ''
  try {
    text = readFileSync(dts, 'utf8')
  } catch {}
  if (!/export default/.test(text)) fail(`missing or empty declaration for ${file} (${dts})`)
}

console.log(`[build] ${writtenFiles.length} files${process.exitCode ? ' (with errors)' : ''}`)

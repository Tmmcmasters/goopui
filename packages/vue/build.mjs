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
//   - the declaration compiler options: mkdist doesn't read tsconfig.json, and its default
//     (node10) module resolution ignores package `exports`, so inferred types got named by
//     file path, e.g. `import("class-variance-authority/dist/types")`. That subpath isn't
//     exported, so in an app the import fails silently (skipLibCheck) and every cva variant
//     prop (GoopButton `variant`/`size`, ...) became `any`.
import { readFileSync } from 'node:fs'
import { mkdist } from 'mkdist'

// Same resolution as tsconfig.base.json, so declarations use the specifiers an app resolves.
const compilerOptions = { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true }

const { errors, writtenFiles } = await mkdist({
  srcDir: 'src',
  distDir: 'dist',
  pattern: ['**', '!**/._*'],
  loaders: ['js', 'vue'],
  format: 'esm',
  ext: 'mjs',
  declaration: true,
  // Explicit '.js' / '/index.js' on relative imports in the .d.ts files: without them an app
  // on `moduleResolution: node16/nodenext` can't follow `export * from './components/button'`
  // and gets no types (attw: InternalResolutionError).
  addRelativeDeclarationExtensions: true,
  typescript: { compilerOptions },
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

// No declaration may reach into another package's private files (e.g. `pkg/dist/...`): with
// `exports` those paths don't resolve in an app, and the type silently becomes `any`.
const DEEP = /(?:import\(|from\s+)["']((?:@[^/"']+\/)?[^./"'][^/"']*\/dist\/[^"']*)["']/g
for (const file of writtenFiles.filter((f) => f.endsWith('.d.ts'))) {
  for (const [, spec] of readFileSync(file, 'utf8').matchAll(DEEP)) fail(`${file} imports a private path: ${spec}`)
}

console.log(`[build] ${writtenFiles.length} files${process.exitCode ? ' (with errors)' : ''}`)

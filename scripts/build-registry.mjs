#!/usr/bin/env node
// Builds the shadcn registries (React: `npx shadcn add`, Vue: `npx shadcn-vue add`) from the
// adapters' own source, so `add <url>` installs the same code as the npm packages, as files the
// user owns. Nothing here is hand-written per component: every folder in
// packages/{react,vue}/src/components/ becomes an item, and its imports decide the rest.
//
//   <base>/react/registry.json        index (the registry.json format, no file contents)
//   <base>/react/<item>.json          registry-item.json, with contents (what `add` fetches)
//   <base>/vue/...                    the same for shadcn-vue
//
// Items, per framework:
//   goop-css    the goo layer rules of the adapter's goop.css, as the item's `css` (the CLI
//               merges them into the project's Tailwind entry CSS). No files.
//   goop-lib    the adapter's shared modules (goop-props, use-goop, config, sound, ...) into
//               lib/goop/. Depends on goop-css and @goopui/core (npm: the engine stays a package).
//   <folder>    one per component folder (button, dialog, ...) into components/ui/goop-<folder>/.
//
// Import rewriting (the CLIs then map `@/components/...` / `@/lib/...` to the project's
// components.json aliases):
//   '../../goop-props' (any adapter top-level module) -> '@/lib/goop/goop-props'
//   '../button/GoopButton'                           -> '@/components/ui/goop-button/GoopButton'
//                                                       + registryDependency on the button item
//   'cn'                                             -> '@/lib/utils' (shadcn's cn helper)
//   './x' (same folder)                              -> unchanged
// npm `dependencies` are the bare imports, pinned to the adapter's package.json ranges
// (@goopui/core to its version: exact while prerelease, else ^; or --core-spec).
//
// Usage: node scripts/build-registry.mjs [--out <dir>] [--base-url <url>] [--core-spec <spec>]
//   --out       output root (default apps/www/public/r)
//   --base-url  where <out> is served, for registryDependencies (default
//               https://goop.timmcmasters.work/r, or $GOOP_REGISTRY_URL)
//   --core-spec the @goopui/core dependency (default packages/core's version; the registry
//               check passes file:<tarball> for an unpublished core)
// Fails (exit 1) on anything an installed item couldn't resolve: an import outside the
// component folders and the shared modules, a missing dependency version, or an empty folder.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HOMEPAGE = 'https://goop.timmcmasters.work'
const UI_PREFIX = 'goop-' // components/ui/goop-button/: never collides with shadcn's own ui files
const LIB_DIR = 'goop' // lib/goop/
const LIB_ITEM = 'goop-lib'
const CSS_ITEM = 'goop-css'
const SKIP_PACKAGES = new Set(['react', 'react-dom', 'vue']) // the app's own

const FRAMEWORKS = {
  react: {
    pkg: 'packages/react',
    cli: 'shadcn',
    itemSchema: 'https://ui.shadcn.com/schema/registry-item.json',
    registrySchema: 'https://ui.shadcn.com/schema/registry.json',
    exts: ['.ts', '.tsx'],
  },
  vue: {
    pkg: 'packages/vue',
    cli: 'shadcn-vue',
    itemSchema: 'https://shadcn-vue.com/schema/registry-item.json',
    registrySchema: 'https://shadcn-vue.com/schema/registry.json',
    exts: ['.ts', '.vue'],
  },
}

// Adapter top-level files that are not shared runtime modules.
const NOT_LIB = new Set(['index.ts', 'manifest.ts'])

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(argv[i])
    if (!m) throw new Error(`unknown argument ${argv[i]}`)
    out[m[1]] = m[2] ?? argv[++i]
  }
  return out
}

const isSource = (name, exts) => !name.startsWith('._') && !name.endsWith('.d.ts') && exts.some((e) => name.endsWith(e))
const read = (p) => readFileSync(p, 'utf8')
const pkgName = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])
const title = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

// Every module specifier in a file: import/export ... from 'x', import 'x', import('x').
const SPEC_RE = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\2/g

/** Docs page frontmatter (title, description) for a component folder, when there is one. */
function docsMeta(slug) {
  const dir = join(ROOT, 'apps/www/content/docs/2.components')
  if (!existsSync(dir)) return {}
  const file = readdirSync(dir).find((f) => !f.startsWith('._') && f.replace(/^\d+\./, '') === `${slug}.md`)
  if (!file) return {}
  const fm = /^---\n([\s\S]*?)\n---/.exec(read(join(dir, file)))?.[1] ?? ''
  const get = (k) => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm)?.[1]?.trim().replace(/^['"]|['"]$/g, '')
  return { title: get('title'), description: get('description') }
}

// ---- CSS: goop.css -> the registry item's `css` object ----------------------------------------

/** Parses plain CSS (no nesting beyond at-rule blocks) into [{ key, decls?, children? }]. */
function parseCss(src) {
  src = src.replace(/\/\*[\s\S]*?\*\//g, '')
  let i = 0
  const block = () => {
    const nodes = []
    let buf = ''
    while (i < src.length) {
      const c = src[i]
      if (c === '"' || c === "'") {
        const end = src.indexOf(c, i + 1)
        buf += src.slice(i, end + 1)
        i = end + 1
      } else if (c === '{') {
        i++
        const key = buf.trim().replace(/\s+/g, ' ')
        buf = ''
        nodes.push({ key, children: block() })
      } else if (c === '}') {
        i++
        if (buf.trim()) nodes.push({ decl: buf.trim() })
        return nodes
      } else if (c === ';') {
        i++
        if (buf.trim()) nodes.push({ decl: buf.trim() })
        buf = ''
      } else {
        buf += c
        i++
      }
    }
    if (buf.trim()) nodes.push({ decl: buf.trim() })
    return nodes
  }
  return block()
}

/**
 * Nodes -> the CLI's nested object ({ '@layer components': { '.sel': { prop: 'value' } } }).
 * A key that repeats in one block (several `@media (prefers-reduced-motion: reduce)` blocks in
 * one layer) is merged and moved to its LAST position, so overrides still come after the rules
 * they override. `@source` / `@import` statements are dropped: the files live in the project,
 * where Tailwind already looks.
 */
function toCssObject(nodes) {
  const obj = {}
  for (const n of nodes) {
    if (n.decl !== undefined) {
      if (n.decl.startsWith('@')) continue
      const colon = n.decl.indexOf(':')
      if (colon < 0) throw new Error(`goop.css: can't parse "${n.decl}"`)
      obj[n.decl.slice(0, colon).trim()] = n.decl.slice(colon + 1).trim().replace(/\s+/g, ' ')
      continue
    }
    const value = toCssObject(n.children)
    if (n.key in obj) {
      const merged = deepMerge(obj[n.key], value)
      delete obj[n.key]
      obj[n.key] = merged
    } else obj[n.key] = value
  }
  return obj
}

function deepMerge(a, b) {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'object' && typeof out[k] === 'object') {
      const merged = deepMerge(out[k], v)
      delete out[k]
      out[k] = merged
    } else {
      delete out[k]
      out[k] = v
    }
  }
  return out
}

// ---- items -----------------------------------------------------------------------------------

export function buildRegistry({ out, baseUrl, coreSpec } = {}) {
  out ??= join(ROOT, 'apps/www/public/r')
  baseUrl = (baseUrl ?? process.env.GOOP_REGISTRY_URL ?? `${HOMEPAGE}/r`).replace(/\/$/, '')
  const coreVersion = JSON.parse(read(join(ROOT, 'packages/core/package.json'))).version
  // A prerelease core is pinned exactly (an alpha may change APIs the copied source uses, like
  // the npm adapters pin it); a stable one by caret.
  coreSpec ??= coreVersion.includes('-') ? coreVersion : `^${coreVersion}`
  const errors = []
  const summary = {}
  const catalog = {} // { react: { button: ['GoopButton', ...] } }: each item's runtime exports

  for (const [fw, cfg] of Object.entries(FRAMEWORKS)) {
    const src = join(ROOT, cfg.pkg, 'src')
    const pkg = JSON.parse(read(join(ROOT, cfg.pkg, 'package.json')))
    const ranges = { ...pkg.peerDependencies, ...pkg.dependencies }
    const url = (name) => `${baseUrl}/${fw}/${name}.json`
    const libNames = readdirSync(src).filter((f) => isSource(f, cfg.exts) && !NOT_LIB.has(f) && statSync(join(src, f)).isFile())
    const libModules = new Set(libNames.map((f) => f.replace(/\.(tsx?|vue)$/, '')))
    const components = readdirSync(join(src, 'components'))
      .filter((d) => !d.startsWith('._') && statSync(join(src, 'components', d)).isDirectory())
      .sort()
    const componentSet = new Set(components)
    const imported = new Set()

    const depOf = (spec, where) => {
      const name = pkgName(spec)
      imported.add(name)
      if (SKIP_PACKAGES.has(name)) return null
      if (name === '@goopui/core') return `@goopui/core@${coreSpec}`
      const range = ranges[name]
      if (!range) {
        errors.push(`${fw}/${where}: imports "${spec}", which ${cfg.pkg}/package.json doesn't list`)
        return name
      }
      return `${name}@${range}`
    }

    /** Rewrites one file's imports. `kind` is 'lib' or the component folder. */
    const rewrite = (code, kind, file, deps, regDeps) =>
      code.replace(SPEC_RE, (all, pre, q, spec) => {
        let to = spec
        if (spec === 'cn') to = '@/lib/utils'
        else if (spec.startsWith('./')) {
          // Same folder: stays relative. In lib, it must be another shared module.
          if (kind === 'lib' && !libModules.has(spec.slice(2).replace(/\.(tsx?|vue)$/, ''))) errors.push(`${fw}/lib/${file}: "${spec}" isn't a shared module`)
        } else if (spec.startsWith('../../')) {
          const mod = spec.slice(6)
          if (kind === 'lib' || !libModules.has(mod.replace(/\.(tsx?|vue)$/, ''))) errors.push(`${fw}/${kind}/${file}: "${spec}" isn't a shared module`)
          to = `@/lib/${LIB_DIR}/${mod}`
          regDeps.add(url(LIB_ITEM))
        } else if (spec.startsWith('../')) {
          const [, other, ...rest] = spec.split('/')
          if (kind === 'lib' || !componentSet.has(other)) errors.push(`${fw}/${kind}/${file}: "${spec}" isn't a component folder`)
          to = `@/components/ui/${UI_PREFIX}${other}${rest.length ? `/${rest.join('/')}` : ''}`
          if (other !== kind) regDeps.add(url(other))
        } else if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/') || spec.startsWith('~')) {
          errors.push(`${fw}/${kind}/${file}: can't map "${spec}"`)
        } else {
          const dep = depOf(spec, `${kind}/${file}`)
          if (dep) deps.add(dep)
        }
        return to === spec ? all : `${pre}${q}${to}${q}`
      })

    const write = (name, item) => {
      const full = { $schema: cfg.itemSchema, name, ...item }
      writeFileSync(join(out, fw, `${name}.json`), `${JSON.stringify(full, null, 2)}\n`)
      return full
    }

    rmSync(join(out, fw), { recursive: true, force: true })
    mkdirSync(join(out, fw), { recursive: true })
    const items = []

    // goop-css
    const css = toCssObject(parseCss(read(join(src, 'goop.css'))))
    items.push(
      write(CSS_ITEM, {
        type: 'registry:style',
        title: 'goopUI styles',
        description: `The goo layer rules every goopUI component needs (the ${pkg.name} goop.css), added to your Tailwind CSS file.`,
        css,
      }),
    )

    // goop-lib
    const libDeps = new Set()
    const libReg = new Set([url(CSS_ITEM)])
    const libFiles = libNames.sort().map((f) => ({
      path: `registry/goopui/lib/${LIB_DIR}/${f}`,
      type: 'registry:lib',
      content: rewrite(read(join(src, f)), 'lib', f, libDeps, libReg),
    }))

    // components
    const compItems = []
    for (const slug of components) {
      const dir = join(src, 'components', slug)
      const deps = new Set()
      const reg = new Set([url(LIB_ITEM), url(CSS_ITEM)])
      const files = readdirSync(dir)
        .filter((f) => isSource(f, cfg.exts) && statSync(join(dir, f)).isFile())
        .sort()
        .map((f) => ({
          path: `registry/goopui/ui/${UI_PREFIX}${slug}/${f}`,
          type: 'registry:ui',
          content: rewrite(read(join(dir, f)), slug, f, deps, reg),
        }))
      if (!files.length) {
        errors.push(`${fw}/${slug}: no source files`)
        continue
      }
      if (!files.some((f) => f.path.endsWith('/index.ts'))) errors.push(`${fw}/${slug}: no index.ts`)
      const meta = docsMeta(slug)
      ;(catalog[fw] ??= {})[slug] = exportsOf(read(join(dir, 'index.ts')))
      compItems.push({
        name: slug,
        type: 'registry:ui',
        title: meta.title ?? title(slug),
        description: meta.description ?? `goopUI ${title(slug)} (${pkg.name}), as source.`,
        dependencies: [...deps].sort(),
        registryDependencies: [...reg],
        files,
      })
    }

    // Packages the adapter lists but no file imports (cuelume: core loads it for `sound`) ride
    // along with the lib, so an installed registry behaves like the npm package.
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      if (!imported.has(name) && name !== 'cn' && !name.startsWith('@goopui/')) libDeps.add(`${name}@${pkg.dependencies[name]}`)
    }
    items.push(
      write(LIB_ITEM, {
        type: 'registry:lib',
        title: 'goopUI lib',
        description: `What every goopUI component shares (props, the engine hook, config, sound), from ${pkg.name}. The engine itself is @goopui/core, from npm.`,
        dependencies: [...libDeps].sort(),
        registryDependencies: [...libReg],
        files: libFiles,
      }),
    )
    for (const item of compItems) items.push(write(item.name, item))

    // The index: registry.json without file contents.
    const index = {
      $schema: cfg.registrySchema,
      name: 'goopui',
      homepage: HOMEPAGE,
      items: items.map(({ $schema, files, ...rest }) => ({
        ...rest,
        ...(files ? { files: files.map(({ content, ...f }) => f) } : {}),
      })),
    }
    writeFileSync(join(out, fw, 'registry.json'), `${JSON.stringify(index, null, 2)}\n`)
    summary[fw] = items.length
  }

  return { errors, summary, catalog, out }
}

/** Value exports of a component folder's index.ts (`GoopButton`, `buttonVariants`, ...). */
function exportsOf(code) {
  const names = []
  for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (let part of m[1].split(',')) {
      part = part.trim()
      if (!part || part.startsWith('type ')) continue
      names.push(part.split(/\s+as\s+/).pop().trim())
    }
  }
  return names
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2))
  const { errors, summary, out } = buildRegistry({ out: args.out, baseUrl: args['base-url'], coreSpec: args['core-spec'] })
  if (errors.length) {
    for (const e of errors) console.error(`build-registry: ${e}`)
    process.exit(1)
  }
  const rel = relative(process.cwd(), out) || '.'
  console.log(`build-registry: ${Object.entries(summary).map(([fw, n]) => `${fw} ${n} items`).join(', ')} -> ${rel.startsWith('..') ? out : rel}`)
}

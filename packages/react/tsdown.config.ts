import { defineConfig } from 'tsdown'

// File-to-file output (`unbundle`), so each component module keeps its own 'use client'
// directive and server-safe modules (variants, goop-props, manifest) stay importable from
// React Server Components. scripts/check-dist.mjs verifies the directives survived.
export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/._*', '!src/**/*.d.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  unbundle: true,
  fixedExtension: true,
  platform: 'neutral',
  external: [/^react/, /^radix-ui/, /^@radix-ui\//, /^@goopui\/core/, 'class-variance-authority', 'cn'],
  copy: [{ from: 'src/goop.css', to: 'dist' }],
  // Unbundled, each 'use client' stays at the top of its own file (checked by check-dist).
  inputOptions: {
    onLog(level, log, handler) {
      if (log.code === 'MODULE_LEVEL_DIRECTIVE') return
      handler(level, log)
    },
  },
})

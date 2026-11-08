import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['**/._*'],
    // SSR tests import all of src cold (slow on the exFAT drive).
    testTimeout: 20_000,
  },
})

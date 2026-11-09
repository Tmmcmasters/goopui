import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['**/._*'],
    // SSR tests import all of src cold, which took over 20s while turbo ran the core,
    // vue and react tests and builds side by side on the exFAT drive (6 SSR files timed out).
    // The limit only bounds a hang, so give cold imports room.
    testTimeout: 90_000,
    hookTimeout: 90_000,
  },
})

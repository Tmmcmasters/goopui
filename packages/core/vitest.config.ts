import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    // macOS AppleDouble files on non-APFS drives
    exclude: ['**/node_modules/**', '**/._*'],
    // The feel tests run whole simulations synchronously; with turbo running the core, vue
    // and react suites side by side one of them passed the 5s default. The limit only bounds a
    // hang.
    testTimeout: 60_000,
  },
})

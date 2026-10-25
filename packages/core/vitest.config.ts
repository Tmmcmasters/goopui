import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    // macOS AppleDouble files on non-APFS drives
    exclude: ['**/node_modules/**', '**/._*'],
  },
})

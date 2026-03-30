import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',

    pool: 'threads',
    isolate: true,

    testTimeout: 8000,
    hookTimeout: 8000,

    clearMocks: true,
    restoreMocks: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
})

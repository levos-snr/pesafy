import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    pool: 'threads',
    isolate: true,
    testTimeout: 8_000,
    hookTimeout: 8_000,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    reporters: process.env.CI ? ['github-actions', 'verbose'] : ['default'],
    coverage: {
      provider: 'v8',
      // lcov is required for Codecov; html is nice locally
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'node_modules',
        'dist',
        'coverage',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/types/**',
        'src/components/**',
      ],
    },
  },
})

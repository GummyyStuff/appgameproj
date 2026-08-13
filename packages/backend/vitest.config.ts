import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test-utils/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.git'],
    server: {
      deps: {
        inline: ['zod'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test-utils/',
        '**/*.test.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
    },
    restoreMocks: true,
    testTimeout: 10000,
  },
})

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      // thresholds: {
      //   statements: 80,
      //   branches: 70,
      //   functions: 80,
      //   lines: 80,
      // },
      exclude: ['node_modules/**', 'dist/**', 'coverage/**', '*.config.{js,ts}', 'tests/**'],
    },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/vitest.setup.ts'],
  },
});

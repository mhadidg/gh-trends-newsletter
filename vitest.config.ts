import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/**', // Node modules
        'dist/**', // Compiled output
        'src/**/*.d.ts', // Type definitions
        'src/mocks/**', // Mock data
        '**/*.config.{js,ts}', // Config files
        'src/preview.ts', // Preview script
      ],
    },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/vitest.setup.ts'],
  },
});

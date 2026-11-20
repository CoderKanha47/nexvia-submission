import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
    setupFiles: ['./setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});

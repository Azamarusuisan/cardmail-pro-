import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/test/**',
        '**/tests/**',
      ],
    },
    setupFiles: ['./setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../'),
      '@server': resolve(__dirname, '../server/src'),
      '@worker': resolve(__dirname, '../worker/src'),
      '@web': resolve(__dirname, '../apps/web/src'),
    },
  },
});
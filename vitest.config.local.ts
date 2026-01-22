/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

// Minimal vitest config for running tests without Next.js/PostCSS dependencies
// NODE_ENV=test is set in package.json test script

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Explicitly disable CSS processing
  // @ts-expect-error - css: false is valid Vitest config but TypeScript types don't recognize it
  css: false,
});


/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

// Minimal vitest config for running tests without Next.js/PostCSS dependencies
// Set NODE_ENV=test to avoid loading .env.local
process.env.NODE_ENV = 'test';

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
  css: false,
});


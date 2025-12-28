/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Disable CSS processing for tests
  css: false,
  // Exclude CSS files from being processed
  exclude: ['**/*.css', '**/*.scss', '**/*.sass', '**/*.less'],
});

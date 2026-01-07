/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { existsSync, renameSync } from 'fs';

// Set NODE_ENV=test for test runs to avoid loading .env.local
process.env.NODE_ENV = 'test';

// Temporarily rename postcss.config.mjs to prevent Vite from loading it during tests
// Vite discovers PostCSS config during initialization, before CSS imports are processed
const postcssConfigPath = path.resolve(__dirname, 'postcss.config.mjs');
const postcssConfigBackup = path.resolve(__dirname, 'postcss.config.mjs.testbak');
let postcssRenamed = false;

if (existsSync(postcssConfigPath) && !existsSync(postcssConfigBackup)) {
  try {
    renameSync(postcssConfigPath, postcssConfigBackup);
    postcssRenamed = true;
  } catch (err) {
    // Ignore rename errors (might be permission issue or already renamed)
  }
}

// Restore PostCSS config on process exit
process.on('exit', () => {
  if (postcssRenamed && existsSync(postcssConfigBackup)) {
    try {
      renameSync(postcssConfigBackup, postcssConfigPath);
    } catch (err) {
      // Ignore restore errors
    }
  }
});

// Also restore on SIGINT/SIGTERM
process.on('SIGINT', () => {
  if (existsSync(postcssConfigBackup)) {
    try {
      renameSync(postcssConfigBackup, postcssConfigPath);
    } catch (err) {
      // Ignore restore errors
    }
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (existsSync(postcssConfigBackup)) {
    try {
      renameSync(postcssConfigBackup, postcssConfigPath);
    } catch (err) {
      // Ignore restore errors
    }
  }
  process.exit(0);
});

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Stub CSS imports to avoid PostCSS processing during tests
      { find: /\.css$/, replacement: path.resolve(__dirname, './src/test/styleStub.ts') },
    ],
  },
  // Skip CSS processing entirely during tests
  css: false,
});

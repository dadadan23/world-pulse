import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { geojsonPlugin } from './scripts/vite-plugins/geojson';

export default defineConfig({
  plugins: [react(), geojsonPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@server': path.resolve(__dirname, './src/server'),
    },
    // Prevent "Multiple instances of Three.js" warnings in the test runner.
    dedupe: ['three'],
  },
  test: {
    globals: true,
    // Default environment; overridden per-glob below.
    environment: 'jsdom',
    // Use jsdom only for renderer tests; run server/main tests in Node so
    // server code cannot accidentally rely on browser globals.
    environmentMatchGlobs: [
      ['src/renderer/**', 'jsdom'],
      ['src/server/**', 'node'],
      ['src/main/**', 'node'],
      ['src/shared/**', 'node'],
    ],
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      all: false,
      reporter: ['text', 'lcov', 'html'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});

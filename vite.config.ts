import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { geojsonPlugin } from './scripts/vite-plugins/geojson';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), geojsonPlugin()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // Split heavy Three.js packages into a separate vendor chunk so the
          // main application bundle stays smaller and the Three.js chunk can be
          // cached independently across deploys.
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
    },
    // Ensure a single Three.js instance is used across the entire build,
    // preventing "Multiple instances of Three.js" warnings at runtime.
    dedupe: ['three'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

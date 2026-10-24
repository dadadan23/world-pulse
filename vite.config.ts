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
    rolldownOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        codeSplitting: {
          groups: [
            {
              // Split heavy Three.js packages into a separate vendor chunk so the
              // main application bundle stays smaller and the Three.js chunk can be
              // cached independently across deploys.
              name: 'vendor-three',
              // Includes the 3D-only transitive dependencies of drei/fiber so the
              // chunk matches what the previous `manualChunks` object produced.
              test: /node_modules[\\/](three|@react-three|three-stdlib|three-mesh-bvh|troika-[^\\/]+|maath|meshline|camera-controls|detect-gpu|stats-gl|stats\.js|hls\.js|@monogrid|@mediapipe|@use-gesture|glsl-noise)[\\/]/,
            },
          ],
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

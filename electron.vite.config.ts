import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { geojsonPlugin } from './scripts/vite-plugins/geojson';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main/main.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@shared': resolve(__dirname, './src/shared'),
        '@server': resolve(__dirname, './src/server'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/preload.ts'),
        },
      },
    },
  },
  renderer: {
    root: '.',
    // Packaged Electron loads index.html via the `file://` protocol (BrowserWindow.loadFile),
    // where absolute asset paths (the Vite default `base: '/'`) resolve against the filesystem
    // root instead of the app directory and 404. Relative paths fix asset loading in production.
    base: './',
    plugins: [react(), geojsonPlugin()],
    build: {
      outDir: 'dist/renderer',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@shared': resolve(__dirname, './src/shared'),
        '@renderer': resolve(__dirname, './src/renderer'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  },
});

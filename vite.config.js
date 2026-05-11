import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vite configuration for Software Empire.
 *
 * - Sets the project root to the workspace folder.
 * - Outputs production builds to `dist/`.
 * - Defines path aliases that mirror the `src/` folder layout so code can
 *   import modules like `@scenes/MainMenuScene.js` instead of long relative
 *   paths. This keeps imports stable as the codebase grows.
 */
export default defineConfig({
  base: './',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@scenes': fileURLToPath(new URL('./src/scenes', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@systems': fileURLToPath(new URL('./src/systems', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@managers': fileURLToPath(new URL('./src/managers', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
});

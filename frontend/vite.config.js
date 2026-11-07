import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { proxy: { '/api': 'http://localhost:8000' } },
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 }
});

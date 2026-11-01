import { defineConfig } from 'vitest/config';

export default defineConfig({
  // itch.io serves the game from a nested path, so every asset URL must be relative.
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // Phaser alone is ~1.2 MB minified; that is expected, not a problem to fix.
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 5173,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

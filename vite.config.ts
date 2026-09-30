import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths, so the build works on GitHub Pages under any repo name.
  base: './',
  build: {
    // Phaser alone is ~1.2 MB; don't warn about it.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});

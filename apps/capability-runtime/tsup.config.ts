import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    target: 'node20',
    format: ['esm'],
    clean: true,
    sourcemap: true,
    outDir: 'dist',
    bundle: true,
    noExternal: [/^@packages\/(?!db).*/],
    external: [
      /^[^@.]/,
      /^@(?!packages\/).*/,
      '@packages/db',
    ],
  },
  {
    entry: ['src/preload-isolation.ts'],
    target: 'node20',
    format: ['cjs'],
    clean: false,
    sourcemap: true,
    outDir: 'dist',
    bundle: true,
    noExternal: [/^@packages\/.*/],
    external: [/^[a-zA-Z]/],
  }
]);

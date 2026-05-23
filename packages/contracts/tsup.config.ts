import { defineConfig } from 'tsup';

export default defineConfig({
  external: [/^@packages\/.*/],
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'node20',
});

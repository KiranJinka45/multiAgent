import { defineConfig } from 'tsup';

export default defineConfig({
  external: [/^@packages\/.*/],
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node20',
  outExtension({ format }) {
    return format === 'esm' ? { js: '.mjs' } : { js: '.cjs' };
  }
});

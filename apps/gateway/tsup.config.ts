import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  target: 'node20',
  format: ['cjs'],
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  bundle: true,
  external: ['@libs/utils', '@libs/observability', '@libs/observability/server'],
});

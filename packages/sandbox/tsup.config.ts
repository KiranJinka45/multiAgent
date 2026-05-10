import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // We use tsc for declarations in this monorepo pattern
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'esnext',
  external: [/^@packages\/.*/, '@packages/sandbox-runtime', '@packages/observability'],
});


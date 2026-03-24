import { defineConfig } from 'tsup';

// export default defineConfig({
//   entry: ['src/index.ts'],
//   format: ['cjs', 'esm'],
//   dts: false,
//   splitting: false,
//   sourcemap: true,
//   clean: true,
//   target: 'node20',
//   external: ['@prisma/client'],
// });
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  target: 'node20',
  external: ['@prisma/client'],
});

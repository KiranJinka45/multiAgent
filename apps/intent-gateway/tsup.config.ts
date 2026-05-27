import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  target: 'node20',
  format: ['esm'],
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  bundle: true,
  noExternal: [/^@packages\/(?!db).*/],
  external: [
    /^[^@.]/,                   // bare specifiers
    /^@(?!packages\/).*/,       // scoped non-workspace packages
    '@packages/db',             // explicit: needs Prisma runtime
  ],
});

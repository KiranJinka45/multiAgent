import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  target: 'node20',
  format: ['esm'],
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  bundle: true,
  // Bundle workspace @packages/* (except db which needs Prisma runtime)
  noExternal: [/^@packages\/(?!db).*/],
  // Externalize everything that isn't a workspace package.
  // This prevents CJS third-party libraries (agentkeepalive, whatwg-url,
  // mongodb, etc.) from being bundled into ESM where their require() calls
  // for Node built-ins would fail at runtime.
  external: [
    /^[^@.]/,                   // bare specifiers (express, cors, pino, …)
    /^@(?!packages\/).*/,       // scoped packages that aren't workspace
    '@packages/db',             // explicit: needs Prisma runtime
  ],
});

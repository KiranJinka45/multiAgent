import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: 'browser',
  target: 'es2022',
  external: [/^@packages\/.*/, 'crypto'],
  // Force bundling of ALL dependencies for the determinism audit bundle
  noExternal: [/@noble\/.*/], 
});

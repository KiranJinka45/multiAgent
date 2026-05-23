import { defineConfig } from 'tsup';

export default defineConfig({
  external: [/^@packages\/.*/, 'graceful-fs', 'fs-extra'],
  entry: ['src/index.ts', 'src/dvk/bridges/ts_bridge.ts'],
  format: ['esm'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node20',
  platform: 'node',
});

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['scripts/system-startup.ts'],
  target: 'node20',
  format: ['cjs'],
  clean: false,
  sourcemap: true,
  outDir: 'scripts',
  bundle: true,
  external: ['ioredis', 'dotenv', 'tsconfig-paths'],
});


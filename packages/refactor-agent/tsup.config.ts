import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/analyzer.ts', 'src/fixer.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  splitting: false,
});

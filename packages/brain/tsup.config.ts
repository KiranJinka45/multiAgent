import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/planner.ts', 'src/memory.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  external: [
    'openai',
    'zod',
    'groq-sdk',
    '@libs/utils',
    '@libs/contracts',
    '@libs/observability',
    '@libs/db',
    '@libs/core-engine'
  ],
});

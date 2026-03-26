import { defineConfig } from 'tsup';

export const baseConfig = defineConfig({
  target: 'node20',
  format: ['cjs', 'esm'], // 🔥 Added ESM
  clean: true,
  sourcemap: process.env.NODE_ENV !== 'production',
  dts: false,
  bundle: true,
  minify: true, // 🔥 Always minify for prod/size check
  treeshake: true, // 🔥 Critical for bundle size
  splitting: true, // 🔥 Critical for code splitting
  outDir: 'dist',
  shims: true,
  external: [
    /^@libs\/.*/,
    'react',
    'react-dom',
    'next',
    'ioredis',
    'bullmq',
    'dotenv',
    'pino',
    'zod',
    'uuid',
    'fs-extra',
    'axios',
    'groq-sdk',
    'undici',
    'readable-stream',
    '@prisma/client',
    'openai',
    'redis',
    'pg'
  ],
});

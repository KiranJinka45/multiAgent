import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node20',
  external: [
    'bullmq',
    'ioredis',
    'pino',
    'uuid',
    'fs-extra',
    'archiver',
    'dotenv',
    'zod',
    'react',
    'stripe',
    'prom-client',
    'redlock',
    'next',
    'socket.io-client',
    '@libs/supabase',
    '@libs/contracts',
    '@temporalio/client',
    'axios'
  ],
});
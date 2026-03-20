import { defineConfig } from 'tsup';

export const baseConfig = {
  format: ['cjs', 'esm'],
  dts: false, // Disabled to prevent heap issues in large monorepos
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
    '@supabase/supabase-js',
    '@temporalio/client',
    '@temporalio/worker',
    'axios',
    'express',
    'socket.io',
    'cors',
    'jsonwebtoken'
  ],
};

export default defineConfig(baseConfig as any);

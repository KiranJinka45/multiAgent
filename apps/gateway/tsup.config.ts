import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  target: 'node20',
  format: ['cjs'],
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  bundle: true,
  noExternal: [
    '@packages/utils', 
    '@packages/observability',
    '@packages/events',
    '@packages/memory-cache',
    '@packages/core-engine',
    '@packages/resilience',
    '@packages/auth-internal',
    '@packages/brain'
  ],
  external: [
    '@packages/db',
    '@kubernetes/client-node',
    '@temporalio/client',
    '@temporalio/worker',
    'bullmq',
    'ioredis',
    'pino',
    'socket.io',
    'socket.io-client'
  ],



});


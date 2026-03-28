module.exports = {
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  target: 'node20',
  external: [
    'bullmq', 'ioredis', 'pino', 'uuid', 'fs-extra', 'archiver', 'dotenv', 'zod', 'react', 'stripe', 'prom-client', 'redlock', 'next', 'socket.io-client', '@supabase/supabase-js', '@temporalio/client', '@temporalio/worker', 'axios', 'express', 'socket.io', 'cors', 'jsonwebtoken',
    '@packages/contracts', '@packages/db', '@packages/observability', '@packages/shared-services', '@packages/memory', '@packages/supabase', '@packages/validator', '@packages/core-engine', '@packages/sandbox', '@packages/agents', '@packages/ai', '@packages/brain', '@packages/build-engine', '@packages/context', '@packages/queue', '@packages/utils'
  ],
  entry: ['src/index.ts'],
};

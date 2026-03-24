import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/server.ts'],
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
    '@libs/registry',
    '@libs/validator',
    '@libs/observability',
    '@libs/db',
    '@temporalio/client',
    'axios'
  ],
});

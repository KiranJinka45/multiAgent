import { defineConfig } from 'vitest/config';
import path from 'path';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'mock-secret-key-12345';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const normalizePath = (p: string) => p.replace(/\\/g, '/');

export default defineConfig({
  resolve: {
    alias: {
      '@packages/governance-core': path.resolve(__dirname, './src/index.ts'),
      '@packages/utils': path.resolve(__dirname, '../utils/src/index.ts'),
      '@temporalio/workflow': path.resolve(__dirname, './test/mocks/temporal-workflow.ts'),
      '@temporalio/client': path.resolve(__dirname, './test/mocks/temporal-client.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    maxWorkers: 1,
    include: [
      normalizePath(path.resolve(__dirname, 'test/integration/**/*.test.ts')),
      normalizePath(path.resolve(__dirname, 'src/**/*.test.ts'))
    ],
    server: {
      deps: {
        inline: [
          /@temporalio/
        ],
      },
    },
  },
});


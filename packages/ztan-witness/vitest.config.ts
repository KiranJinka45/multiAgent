import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    server: {
      deps: {
        external: [
          '@packages/observability',
          '@packages/utils',
          '@packages/db',
          '@packages/contracts'
        ]
      }
    },
    ssr: {
      external: [
        '@packages/observability',
        '@packages/utils',
        '@packages/db',
        '@packages/contracts'
      ]
    }
  },
  resolve: {
    alias: {
      '@packages/contracts': resolve(__dirname, '../contracts/src'),
      '@packages/observability': resolve(__dirname, '../observability/src'),
      '@packages/utils': resolve(__dirname, '../utils/src'),
      '@packages/db': resolve(__dirname, '../db/src'),
    }
  }
});


import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@packages/observability': resolve(__dirname, '../observability/src/index.ts'),
    },
  },
});

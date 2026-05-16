import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        'vitest.config.ts',
        'vitest.workspace.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@packages/utils': path.resolve(__dirname, './packages/utils/src'),
      '@packages/ecosystem-governance': path.resolve(__dirname, './packages/ecosystem-governance/src'),
      '@packages/observability': path.resolve(__dirname, './packages/observability/src'),
    },
  },
});


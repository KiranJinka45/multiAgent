import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/orchestrator.ts', 'src/analyzer.ts', 'src/architect.ts', 'src/refactor.ts', 'src/validator.ts'],
  external: [
    'openai',
    'zod',
    '@libs/observability',
    '@libs/utils',
    '@libs/refactor-agent'
  ],
});

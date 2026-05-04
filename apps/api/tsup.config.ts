import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  ...baseConfig,
  dts: false,
  entry: ['src/index.ts'],
  external: [...(baseConfig.external || []), 'dockerode', '@temporalio/client', 'pg'],
});


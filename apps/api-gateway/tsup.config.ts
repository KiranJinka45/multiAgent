import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  ...baseConfig,
  entry: ['../../packages/utils/src/services/socket.ts'],
  outDir: 'dist',
});

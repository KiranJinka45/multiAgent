import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  external: [/^@packages\/.*/],
  ...baseConfig,
  dts: false,
  entry: ['src/index.ts', 'src/server.ts'],
});


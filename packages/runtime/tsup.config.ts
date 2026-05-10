import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  external: [/^@packages\/.*/],
  ...baseConfig,
  entry: ['src/index.ts', 'src/watchdog.ts'],
  dts: true,
  clean: true,
});

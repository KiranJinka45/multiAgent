import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';

export default defineConfig({
  ...baseConfig,
  entry: {
    index: 'src/index.ts',
    watchdog: 'src/watchdog.ts',
    executor: 'src/executor.ts',
    'preview-manager': 'src/preview-manager.ts',
    'cluster/runtimeScheduler': 'src/cluster/runtimeScheduler.ts',
  },
  dts: false,
  outDir: 'dist',
});


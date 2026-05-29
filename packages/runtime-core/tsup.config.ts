import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base.ts';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/supervisor/host-daemon.ts'],
  external: [
    ...(baseConfig.external || []),
    '@prisma/client',
    '.prisma/client',
  ],
});

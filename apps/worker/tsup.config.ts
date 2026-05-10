import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';
import fs from 'fs';

export default defineConfig({
  external: [/^@packages\/.*/],
  ...baseConfig,
  dts: false,
  entry: ["src/index.ts"],
});


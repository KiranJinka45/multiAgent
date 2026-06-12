import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';
import fs from 'fs';

export default defineConfig({
  ...baseConfig,
  external: [/^@packages\/.*/],
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  bundle: false,
  splitting: false,
});


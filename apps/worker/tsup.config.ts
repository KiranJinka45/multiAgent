import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';
import fs from 'fs';

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
});

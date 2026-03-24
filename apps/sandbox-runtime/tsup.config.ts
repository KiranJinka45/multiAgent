import { defineConfig } from 'tsup';
import { baseConfig } from '../../tsup.config.base';
import fs from 'fs';
import path from 'path';

const entries = fs.readdirSync('src')
  .filter(file => file.endsWith('.ts'))
  .map(file => `src/${file}`);

export default defineConfig({
  ...baseConfig,
  entry: entries,
});

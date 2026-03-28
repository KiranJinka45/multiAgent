module.exports = {
  entry: [
    'src/index.ts',
    'src/**/*.ts'
  ],
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  bundle: false,
  minify: false,
  sourcemap: true,
  external: [
    'fs', 'path', 'crypto', 'redis', 'ioredis', 'bullmq', 'pino', 'uuid', 'fs-extra', 'archiver', 'dotenv', 'groq-sdk',
    '@packages/contracts', '@packages/db', '@packages/observability', '@packages/registry', '@packages/supabase', '@packages/validator', '@packages/core-engine', '@packages/sandbox', '@packages/agents', '@apps/sandbox-runtime', '@apps/preview-runtime', '@packages/agents', '@packages/ai', '@packages/brain', '@packages/build-engine', '@packages/context'
  ],
};

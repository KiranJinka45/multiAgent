import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client/index.ts",
    "src/server/index.ts"
  ],
  format: ["cjs", "esm"],
  dts: false,
  clean: true,
  bundle: false,
  minify: false,
  sourcemap: true,
  external: [
    "fs",
    "path",
    "crypto",
    "redis",
    "ioredis",
    "bullmq",
    "pino",
    "uuid",
    "fs-extra",
    "archiver",
    "dotenv",
    "groq-sdk"
  ]
});

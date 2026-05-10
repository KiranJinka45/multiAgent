import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/frontend.ts', 'src/backend.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'node20',
    external: [/^@packages\/.*/, 'zod', 'dotenv', '@aws-sdk/client-secrets-manager'],
    outExtension({ format }) {
        return format === 'esm' ? { js: '.mjs' } : { js: '.cjs' };
    }
});

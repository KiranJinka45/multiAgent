import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/otel.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'node20',
    external: [/^@packages\/.*/, 'pino', 'prom-client', /^@opentelemetry\/.+/],
    outExtension({ format }) {
        return format === 'esm' ? { js: '.mjs' } : { js: '.cjs' };
    }
});

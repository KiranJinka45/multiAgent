export default {
    entry: ['src/index.ts', 'src/server.ts'],
    format: ['cjs', 'esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['@packages/*'],
}
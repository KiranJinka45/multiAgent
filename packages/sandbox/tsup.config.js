"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: false, // We use tsc for declarations in this monorepo pattern
    clean: true,
    sourcemap: true,
    minify: false,
    target: 'esnext',
    external: ['@packages/sandbox-runtime', '@packages/observability'],
});
//# sourceMappingURL=tsup.config.js.map
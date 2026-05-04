"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: {
        index: 'src/index.ts',
        frontend: 'src/frontend.ts',
        backend: 'src/backend.ts'
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'node20',
    outExtension({ format }) {
        return format === 'esm' ? { js: '.mjs' } : { js: '.cjs' };
    }
});
//# sourceMappingURL=tsup.config.js.map
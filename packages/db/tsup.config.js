"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: false,
    splitting: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'es2020'
});
//# sourceMappingURL=tsup.config.js.map
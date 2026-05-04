"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    entry: ['src/index.ts', 'src/server.ts'],
    format: ['cjs', 'esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['@packages/*'],
};
//# sourceMappingURL=tsup.config.js.map
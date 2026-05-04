"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: ['scripts/system-startup.ts'],
    target: 'node20',
    format: ['cjs'],
    clean: false,
    sourcemap: true,
    outDir: 'scripts',
    bundle: true,
    external: ['ioredis', 'dotenv', 'tsconfig-paths'],
});
//# sourceMappingURL=tsup.config.js.map
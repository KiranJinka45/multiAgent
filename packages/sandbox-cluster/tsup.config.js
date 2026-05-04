"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: {
        index: "src/index.ts",
        runtime: "src/runtime/index.ts",
        cluster: "src/cluster/index.ts"
    },
    format: ["cjs", "esm"],
    dts: false,
    clean: true,
    sourcemap: true,
    minify: false,
    splitting: false,
    target: "node20"
});
//# sourceMappingURL=tsup.config.js.map
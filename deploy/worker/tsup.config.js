"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
const tsup_config_base_1 = require("../../tsup.config.base");
exports.default = (0, tsup_1.defineConfig)({
    ...tsup_config_base_1.baseConfig,
    dts: false,
    entry: ["src/index.ts"],
});
//# sourceMappingURL=tsup.config.js.map
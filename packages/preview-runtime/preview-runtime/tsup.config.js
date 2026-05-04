"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
const tsup_config_base_1 = require("../../tsup.config.base");
exports.default = (0, tsup_1.defineConfig)({
    ...tsup_config_base_1.baseConfig,
    entry: {
        index: 'src/index.ts',
        watchdog: 'src/watchdog.ts',
        executor: 'src/executor.ts',
        'preview-manager': 'src/preview-manager.ts',
        'cluster/runtimeScheduler': 'src/cluster/runtimeScheduler.ts',
    },
    dts: false,
    outDir: 'dist',
});
//# sourceMappingURL=tsup.config.js.map
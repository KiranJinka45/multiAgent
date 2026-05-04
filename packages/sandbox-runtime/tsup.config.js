"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
const tsup_config_base_1 = require("../../tsup.config.base");
const fs_1 = __importDefault(require("fs"));
const entries = fs_1.default.readdirSync('src')
    .filter(file => file.endsWith('.ts'))
    .map(file => `src/${file}`);
exports.default = (0, tsup_1.defineConfig)({
    ...tsup_config_base_1.baseConfig,
    entry: entries,
});
//# sourceMappingURL=tsup.config.js.map
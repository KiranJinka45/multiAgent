"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function standardizeTSConfig(dir) {
    const tsconfigPath = path_1.default.join(dir, 'tsconfig.json');
    if (!fs_1.default.existsSync(tsconfigPath))
        return;
    let lines = fs_1.default.readFileSync(tsconfigPath, 'utf8').split('\n');
    // Remove lines starting with //
    const filteredLines = lines.filter(line => !line.trim().startsWith('//'));
    let tsconfig = JSON.parse(filteredLines.join('\n'));
    // Extend base
    tsconfig.extends = "../../tsconfig.base.json";
    // Ensure outDir is dist
    if (tsconfig.compilerOptions) {
        tsconfig.compilerOptions.outDir = "dist";
    }
    fs_1.default.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
    console.log(`✅ Standardized tsconfig in ${path_1.default.basename(dir)}`);
}
const APPS_DIR = path_1.default.resolve('apps');
const PKGS_DIR = path_1.default.resolve('packages');
fs_1.default.readdirSync(APPS_DIR).forEach(d => standardizeTSConfig(path_1.default.join(APPS_DIR, d)));
fs_1.default.readdirSync(PKGS_DIR).forEach(d => standardizeTSConfig(path_1.default.join(PKGS_DIR, d)));
//# sourceMappingURL=standardize-tsconfig.js.map
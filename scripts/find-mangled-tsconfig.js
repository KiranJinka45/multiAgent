"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function findMangled(dir) {
    const tsconfigPath = path_1.default.join(dir, 'tsconfig.json');
    if (!fs_1.default.existsSync(tsconfigPath))
        return;
    try {
        let content = fs_1.default.readFileSync(tsconfigPath, 'utf8');
        // Basic comment stripping (safe line-based)
        const lines = content.split('\n').filter(line => !line.trim().startsWith('//'));
        JSON.parse(lines.join('\n'));
    }
    catch (e) {
        console.log(`❌ Mangled: ${tsconfigPath}`);
        console.log(`   Error: ${e.message}`);
        // Read raw to see what's wrong
        console.log(`   Content: ${fs_1.default.readFileSync(tsconfigPath, 'utf8').substring(0, 100)}...`);
    }
}
const APPS_DIR = path_1.default.resolve('apps');
const PKGS_DIR = path_1.default.resolve('packages');
fs_1.default.readdirSync(APPS_DIR).forEach(d => findMangled(path_1.default.join(APPS_DIR, d)));
fs_1.default.readdirSync(PKGS_DIR).forEach(d => findMangled(path_1.default.join(PKGS_DIR, d)));
//# sourceMappingURL=find-mangled-tsconfig.js.map
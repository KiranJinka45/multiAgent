"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * PRODUCTION POLICY ENFORCEMENT
 * Runs during CI to catch common ESM/Monorepo configuration errors.
 */
const ROOT = process.cwd();
function checkEsmImports(dir) {
    const files = fs_1.default.readdirSync(dir);
    for (const file of files) {
        const fullPath = path_1.default.join(dir, file);
        if (fs_1.default.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') {
                checkEsmImports(fullPath);
            }
            continue;
        }
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs_1.default.readFileSync(fullPath, 'utf8');
            // Regex to find relative imports like: import { x } from './utils';
            // ESM requires: import { x } from './utils.js';
            const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
            let match;
            while ((match = relativeImportRegex.exec(content)) !== null) {
                const importPath = match[1];
                if (!importPath.endsWith('.js') && !importPath.endsWith('.css') && !importPath.endsWith('.json')) {
                    console.error(`❌ ESM VIOLATION in ${fullPath}: Relative import "${importPath}" missing .js extension`);
                    process.exitCode = 1;
                }
            }
        }
    }
}
console.log("🛡️ Running Production Policy Checks...");
const PACKAGES_DIR = path_1.default.join(ROOT, 'packages');
const APPS_DIR = path_1.default.join(ROOT, 'apps');
if (fs_1.default.existsSync(PACKAGES_DIR))
    checkEsmImports(PACKAGES_DIR);
if (fs_1.default.existsSync(APPS_DIR))
    checkEsmImports(APPS_DIR);
if (process.exitCode === 1) {
    console.log("\n❌ Production checks failed. Please fix the violations above.");
}
else {
    console.log("\n✅ All production policies satisfied.");
}
//# sourceMappingURL=prod-checks.js.map
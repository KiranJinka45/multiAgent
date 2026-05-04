"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function standardizePackage(dir, type) {
    const pkgPath = path_1.default.join(dir, 'package.json');
    if (!fs_1.default.existsSync(pkgPath))
        return;
    const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
    // Skip Next.js apps based on dev script
    if (pkg.scripts && pkg.scripts.dev && pkg.scripts.dev.includes('next dev')) {
        console.log(`⏩ Skipping Next.js app: ${pkg.name}`);
        return;
    }
    // Standardize Scripts
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.build = "tsup";
    if (type === 'app') {
        pkg.scripts.dev = 'tsup --watch --onSuccess "node dist/index.js"';
    }
    else {
        pkg.scripts.dev = "tsup --watch";
    }
    pkg.scripts.lint = "eslint .";
    pkg.scripts.typecheck = "tsc --noEmit";
    fs_1.default.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Standardized ${pkg.name}`);
}
const APPS_DIR = path_1.default.resolve('apps');
const PKGS_DIR = path_1.default.resolve('packages');
fs_1.default.readdirSync(APPS_DIR).forEach(d => standardizePackage(path_1.default.join(APPS_DIR, d), 'app'));
fs_1.default.readdirSync(PKGS_DIR).forEach(d => standardizePackage(path_1.default.join(PKGS_DIR, d), 'lib'));
//# sourceMappingURL=standardize-scripts.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const baseConfig = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
        outDir: "dist",
        rootDir: "src"
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"]
};
function reconstruct(dir) {
    const tsconfigPath = path_1.default.join(dir, 'tsconfig.json');
    // We always want a tsconfig if it's a package/app directory with a src folder
    if (!fs_1.default.existsSync(path_1.default.join(dir, 'src')) && !fs_1.default.existsSync(tsconfigPath))
        return;
    fs_1.default.writeFileSync(tsconfigPath, JSON.stringify(baseConfig, null, 2) + '\n');
    console.log(`🛠️ Reconstructed: ${path_1.default.basename(dir)}/tsconfig.json`);
}
const APPS_DIR = path_1.default.resolve('apps');
const PKGS_DIR = path_1.default.resolve('packages');
fs_1.default.readdirSync(APPS_DIR).forEach(d => reconstruct(path_1.default.join(APPS_DIR, d)));
fs_1.default.readdirSync(PKGS_DIR).forEach(d => reconstruct(path_1.default.join(PKGS_DIR, d)));
//# sourceMappingURL=reconstruct-tsconfigs.js.map
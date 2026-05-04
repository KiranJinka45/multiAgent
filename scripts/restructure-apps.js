"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function restructure(appDir) {
    const srcDir = path_1.default.join(appDir, 'src');
    if (!fs_1.default.existsSync(srcDir)) {
        fs_1.default.mkdirSync(srcDir, { recursive: true });
    }
    const files = fs_1.default.readdirSync(appDir);
    files.forEach(file => {
        if (file.endsWith('.ts') && !file.includes('config') && file !== 'src') {
            const oldPath = path_1.default.join(appDir, file);
            const newPath = path_1.default.join(srcDir, file);
            try {
                fs_1.default.renameSync(oldPath, newPath);
                console.log(`✅ Moved ${file} to src/`);
            }
            catch (e) {
                console.log(`❌ Failed to move ${file}: ${e.message}`);
            }
        }
    });
}
const appsToFix = [
    path_1.default.resolve('apps/billing-service'),
    path_1.default.resolve('apps/worker')
];
appsToFix.forEach(dir => {
    if (fs_1.default.existsSync(dir)) {
        console.log(`🛠️ Restructuring ${path_1.default.basename(dir)}...`);
        restructure(dir);
    }
});
//# sourceMappingURL=restructure-apps.js.map
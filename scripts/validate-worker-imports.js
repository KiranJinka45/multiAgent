"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const workersDir = path_1.default.join(process.cwd(), 'workers');
const workers = fs_1.default.readdirSync(workersDir).filter(f => f.endsWith('.ts'));
console.log(`Checking ${workers.length} workers...`);
workers.forEach(worker => {
    const content = fs_1.default.readFileSync(path_1.default.join(workersDir, worker), 'utf8');
    const imports = content.match(/from ['"](\.\.?\/.*)['"]/g);
    if (imports) {
        imports.forEach(imp => {
            const relPath = imp.match(/['"](.*)['"]/)[1];
            const fullPath = path_1.default.resolve(workersDir, relPath);
            // Check for .ts, .tsx, or directory/index.ts
            const possiblePaths = [
                fullPath + '.ts',
                fullPath + '.tsx',
                path_1.default.join(fullPath, 'index.ts'),
                fullPath // literal
            ];
            const exists = possiblePaths.some(p => fs_1.default.existsSync(p));
            if (!exists) {
                console.error(`❌ [${worker}] Broken import: ${relPath} (Resolved: ${fullPath})`);
            }
        });
    }
});
//# sourceMappingURL=validate-worker-imports.js.map
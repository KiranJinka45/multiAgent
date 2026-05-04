"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const snapshot_library_1 = require("../runtime/snapshot-library");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger_1 = __importDefault(require("../config/logger"));
const child_process_1 = require("child_process");
async function main() {
    const templatesDir = path_1.default.join(process.cwd(), 'templates');
    const snapshotBase = path_1.default.join(process.cwd(), '.snapshots', 'base');
    await fs_extra_1.default.ensureDir(snapshotBase);
    await snapshot_library_1.SnapshotLibrary.init();
    const frameworkMappings = [
        { id: 'nextjs-base', framework: 'nextjs', template: 'nextjs-saas-premium' },
        { id: 'vite-base', framework: 'vite', template: 'nextjs-landing-v1' }
    ];
    for (const mapping of frameworkMappings) {
        const sourceDir = path_1.default.join(templatesDir, mapping.template);
        if (await fs_extra_1.default.pathExists(sourceDir)) {
            // Ensure dependencies exist in the source template
            const nodeModules = path_1.default.join(sourceDir, 'node_modules');
            if (!(await fs_extra_1.default.pathExists(nodeModules))) {
                logger_1.default.info({ template: mapping.template }, '[PopulateSnapshots] node_modules missing in template. Installing...');
                try {
                    (0, child_process_1.execSync)('npm install --no-audit --no-fund', { cwd: sourceDir, stdio: 'inherit' });
                }
                catch (installErr) {
                    logger_1.default.error({ installErr }, 'Failed to install dependencies in template. Snapshot will be partial.');
                }
            }
            logger_1.default.info({ mapping }, '[PopulateSnapshots] Creating snapshot...');
            await snapshot_library_1.SnapshotLibrary.createBaseSnapshot(mapping.id, mapping.framework, sourceDir);
            // Verification: Log snapshot path
            const snapshot = await snapshot_library_1.SnapshotLibrary.getSnapshot(mapping.framework);
            if (snapshot) {
                logger_1.default.info({ snapshot }, '✅ Snapshot verified and active.');
            }
        }
        else {
            logger_1.default.warn({ template: mapping.template }, 'Template source not found. Skipping.');
        }
    }
    logger_1.default.info('Snapshot Library Population Complete.');
}
main().catch(err => {
    logger_1.default.error({ err }, 'Failed to populate snapshot library');
    process.exit(1);
});
//# sourceMappingURL=populate-snapshots.js.map
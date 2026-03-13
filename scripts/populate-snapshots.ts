import { SnapshotLibrary } from '../runtime/snapshot-library';
import path from 'path';
import fs from 'fs-extra';
import logger from '../config/logger';
import { execSync } from 'child_process';

async function main() {
    const templatesDir = path.join(process.cwd(), 'templates');
    const snapshotBase = path.join(process.cwd(), '.snapshots', 'base');

    await fs.ensureDir(snapshotBase);
    await SnapshotLibrary.init();

    const frameworkMappings = [
        { id: 'nextjs-base', framework: 'nextjs', template: 'nextjs-saas-premium' },
        { id: 'vite-base', framework: 'vite', template: 'nextjs-landing-v1' }
    ];

    for (const mapping of frameworkMappings) {
        const sourceDir = path.join(templatesDir, mapping.template);
        if (await fs.pathExists(sourceDir)) {
            // Ensure dependencies exist in the source template
            const nodeModules = path.join(sourceDir, 'node_modules');
            if (!(await fs.pathExists(nodeModules))) {
                logger.info({ template: mapping.template }, '[PopulateSnapshots] node_modules missing in template. Installing...');
                try {
                    execSync('npm install --no-audit --no-fund', { cwd: sourceDir, stdio: 'inherit' });
                } catch (installErr) {
                    logger.error({ installErr }, 'Failed to install dependencies in template. Snapshot will be partial.');
                }
            }

            logger.info({ mapping }, '[PopulateSnapshots] Creating snapshot...');
            await SnapshotLibrary.createBaseSnapshot(mapping.id, mapping.framework, sourceDir);
            
            // Verification: Log snapshot path
            const snapshot = await SnapshotLibrary.getSnapshot(mapping.framework);
            if (snapshot) {
                logger.info({ snapshot }, '✅ Snapshot verified and active.');
            }
        } else {
            logger.warn({ template: mapping.template }, 'Template source not found. Skipping.');
        }
    }

    logger.info('Snapshot Library Population Complete.');
}

main().catch(err => {
    logger.error({ err }, 'Failed to populate snapshot library');
    process.exit(1);
});

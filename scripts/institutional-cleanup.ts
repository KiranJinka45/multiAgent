import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ZTAN Strategic Reduction Script
 * Purges speculative complexity and unused artifacts for the V1.0 Baseline.
 */
const SURVIVORS = new Set([
    'admin-setup.ts',
    'cell-resurrection.ts',
    'certify-baseline.ts',
    'verify-invariants.ts',
    'entropy-stress.ts',
    'verify-disaster-recovery.ts',
    'institutional-cleanup.ts' // Self
]);

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');

function cleanup() {
    console.log('🧹 Starting ZTAN Strategic Reduction (Institutional Purge)...');

    const items = fs.readdirSync(SCRIPTS_DIR);
    let deletedCount = 0;

    items.forEach(item => {
        const fullPath = path.join(SCRIPTS_DIR, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
             // Purge all subdirectories (chaos, sre, k6, etc.)
             console.log(`   - Purging directory: ${item}`);
             fs.rmSync(fullPath, { recursive: true, force: true });
             deletedCount++;
        } else if (stats.isFile()) {
            if (!SURVIVORS.has(item)) {
                console.log(`   - Deleting junk: ${item}`);
                fs.unlinkSync(fullPath);
                deletedCount++;
            }
        }
    });

    console.log(`\n✅ REDUCTION COMPLETE: Purged ${deletedCount} speculative artifacts.`);
    console.log('   Institutional core is now SMALL and SURVIVABLE.');
}

cleanup();

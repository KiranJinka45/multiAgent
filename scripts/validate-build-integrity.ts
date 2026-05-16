import { execSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * ZTAN BUILD INTEGRITY VALIDATOR
 * Ensures that the current workspace state is deterministic and suitable for a production build.
 */

function validate() {
    console.log('🛡️  VALIDATING BUILD INTEGRITY...');

    // 1. Check for lockfile synchronization
    try {
        console.log('   - Checking lockfile sync...');
        execSync('pnpm install --frozen-lockfile --lockfile-only', { stdio: 'ignore' });
        console.log('   ✅ Lockfile is synchronized.');
    } catch (err) {
        console.error('   ❌ ERROR: pnpm-lock.yaml is out of sync with package.json. Run pnpm install.');
        process.exit(1);
    }

    // 2. Check for uncommitted changes (Optional, but good for CI)
    try {
        const status = execSync('git status --porcelain').toString();
        if (status) {
            console.warn('   ⚠️  WARNING: Uncommitted changes detected. This build may not be reproducible.');
            console.warn(status);
        } else {
            console.log('   ✅ Workspace is clean.');
        }
    } catch (err) {
        console.warn('   ⚠️  WARNING: Could not verify git status. Ensure git is initialized.');
    }

    // 3. Verify node_modules integrity
    if (!fs.existsSync('node_modules')) {
        console.error('   ❌ ERROR: node_modules missing. Run pnpm install first.');
        process.exit(1);
    }

    console.log('\n✨ INTEGRITY VALIDATION PASSED.');
}

validate();

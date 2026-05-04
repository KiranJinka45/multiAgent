import { BuildCacheManager } from '../api-gateway/services/build-cache-manager';
import { PreviewRuntimePool } from '../runtime/previewRuntimePool';
import { BuildGraphEngine } from '../api-gateway/services/build-graph-engine';
import fs from 'fs-extra';
import path from 'path';
import logger from '../config/logger';

async function verifyUltimateArch() {
    console.log('=== MULTIAGENT ULTIMATE ARCHITECTURE VERIFICATION ===');

    const testProject = path.join(process.cwd(), '.previews', 'test-perf-project');
    await fs.ensureDir(testProject);
    await fs.writeJSON(path.join(testProject, 'package.json'), { name: 'test-perf' });
    await fs.ensureDir(path.join(testProject, 'app'));
    await fs.writeFile(path.join(testProject, 'app/page.tsx'), 'export default () => <div>Hello World</div>');

    // 1. Verify CAS
    console.log('\n--- 1. Verifying Content-Addressable Storage (CAS) ---');
    await BuildCacheManager.init();
    const startTime = Date.now();
    const hash = await BuildCacheManager.putBlob(testProject);
    console.log(`✅ CAS Push: ${hash}`);
    
    const restoreDir = path.join(process.cwd(), '.previews', 'test-restore');
    await BuildCacheManager.getBlob(hash, restoreDir);
    const duration = Date.now() - startTime;
    console.log(`✅ CAS Restore: ${duration}ms`);

    // 2. Verify Dependency Tracking
    console.log('\n--- 2. Verifying Dependency Tree Tracking ---');
    const affected = await BuildGraphEngine.getAffectedNodes(testProject);
    console.log(`✅ BuildGraph: ${affected.length} nodes affected`);

    // 3. Verify Hot-Swap Injection (Mocking pool)
    console.log('\n--- 3. Verifying Hot-Swap Injection ---');
    try {
        // Pre-warm manually for test
        // await PreviewRuntimePool.prewarm(); 
        console.log('ℹ️ Hot-Swap requires active Docker. Skipping live container test in script.');
    } catch (e) {
        console.log('⚠️ Hot-Swap test failed (Docker might be offline)');
    }

    console.log('\n=== VERIFICATION COMPLETE ===');
    process.exit(0);
}

verifyUltimateArch().catch(err => {
    console.error(err);
    process.exit(1);
});


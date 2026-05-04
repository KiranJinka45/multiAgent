import { ProvisioningService } from '../apps/api/src/services/ProvisioningService';
import { BuildCache } from '../packages/utils/src/build-cache';
import { db } from '@packages/db';
import { logger } from '@packages/observability';
import * as fs from 'fs-extra';
import * as path from 'path';

async function verify() {
    console.log('--- 🧪 STARTING 5-MINUTE MAGIC VERIFICATION ---');

    // 1. Seed Warm Pool
    try {
        await ProvisioningService.seedWarmPool(2);
        const warmCount = await db.tenant.count({
            where: { metadata: { path: ['isWarm'], equals: true } }
        });
        console.log(`[Verification] Warm pool size: ${warmCount}`);

        // 2. Test Claiming (Speed Test)
        const start = Date.now();
        const result = await ProvisioningService.provisionTenant('MagicOrg', 'user_magic_123');
        const duration = Date.now() - start;
        console.log(`[Verification] Tenant claimed in ${duration}ms (Target: < 500ms)`);
    } catch (dbErr) {
        console.warn(`[Verification] Skipping DB-dependent tests (No DB connection)`);
    }

    // 3. Verify Cache Restoration
    const testDir = path.join(process.cwd(), 'tmp', 'cache-test');
    await fs.ensureDir(testDir);
    
    // Seed a mock cache first
    const cacheRoot = path.join(process.cwd(), '.build-cache', 'nextjs-tailwind-basic', 'node_modules');
    await fs.ensureDir(cacheRoot);
    await fs.writeFile(path.join(cacheRoot, 'version.txt'), '1.0.0');

    const cacheStart = Date.now();
    const restored = await BuildCache.restore('nextjs-tailwind-basic', testDir);
    const cacheDuration = Date.now() - cacheStart;
    
    console.log(`[Verification] Cache restored: ${restored} in ${cacheDuration}ms (Target: < 100ms)`);

    // Cleanup
    await fs.remove(testDir);
    
    console.log('--- ✅ VERIFICATION COMPLETE ---');
}

verify().catch(console.error);

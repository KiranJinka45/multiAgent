import { AuditLogger } from '../packages/utils/src/audit.js';
import { db } from '../packages/db/src/index.js';

async function bootstrapAudit() {
    console.log('🚀 Bootstrapping Sovereign Genesis for Phase 43 Audit...');

    const tenantId = 'tenant-alice-001';

    // 1. Clear previous logs for this tenant to ensure a clean chain
    await db.auditLog.deleteMany({ where: { tenantId } });

    // 2. Generate Genesis Entry
    await AuditLogger.log({
        action: 'INSTITUTIONAL_GENESIS',
        resource: 'sovereign-root',
        tenantId,
        status: 'SUCCESS',
        metadata: {
            version: 'v1.12',
            epoch: 0,
            entropy: 'PHYSICAL_ENTROPY_09123'
        }
    });

    // 3. Generate some mutation events
    for (let i = 1; i <= 4; i++) {
        await AuditLogger.log({
            action: `MISSION_UPDATE_0${i}`,
            resource: 'mission-engine',
            tenantId,
            status: 'SUCCESS',
            metadata: { sequence: i }
        });
    }

    console.log('✅ Audit chain bootstrapped with 5 entries.');
    
    const verification = await AuditLogger.verifyChain(tenantId);
    console.log(`🔍 Initial Chain Verification: ${verification.valid ? 'VALID' : 'INVALID'}`);
}

bootstrapAudit().catch(console.error);

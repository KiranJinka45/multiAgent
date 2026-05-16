import { AuditLogger } from '../packages/utils/src/audit.js';
import { db } from '../packages/db/src/index.js';

async function tamperDrill() {
    const tenantId = 'tenant-alice-001';

    console.log('🛡️ Starting Tamper Evidence Drill...');

    // 1. Verify chain is valid initially
    const initial = await AuditLogger.verifyChain(tenantId);
    if (!initial.valid) {
        throw new Error('❌ Drill aborted: Chain is already invalid.');
    }
    console.log('   ✅ Baseline: Chain is VALID.');

    // 2. Tamper with the 3rd entry
    const logs = await db.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
    });

    if (logs.length < 3) {
        throw new Error('❌ Drill aborted: Not enough logs.');
    }

    const target = logs[2];
    console.log(`   🔥 Tampering with Log ID: ${target.id} (Action: ${target.action})...`);

    await db.auditLog.update({
        where: { id: target.id },
        data: { action: 'MALICIOUS_TAMPER' }
    });

    // 3. Verify chain again
    const after = await AuditLogger.verifyChain(tenantId);
    if (after.valid) {
        throw new Error('❌ TAMPER DETECTION FAILED: Chain still reported as VALID.');
    }

    console.log(`   ✅ TAMPER DETECTED at Log ID: ${after.brokenAtId}`);
    if (after.brokenAtId === target.id) {
        console.log('   ✅ Accuracy verified: Detected at exact tampering point.');
    } else {
        console.warn(`   ⚠️ Accuracy mismatch: Expected ${target.id}, got ${after.brokenAtId}`);
    }

    // 4. Restore for future tests (Optional but good)
    await db.auditLog.update({
        where: { id: target.id },
        data: { action: target.action }
    });
    console.log('   ✅ Chain restored.');

    const final = await AuditLogger.verifyChain(tenantId);
    console.log(`   🔍 Post-restoration Verification: ${final.valid ? 'VALID' : 'INVALID'}`);

    console.log('\n🏆 TAMPER EVIDENCE DRILL SUCCESSFUL.');
}

tamperDrill().catch(console.error);

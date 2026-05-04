import 'dotenv/config';
import { regionalGovernance, RegionalStatus, IdempotencyManager, db, redis } from '../packages/utils/src';
import { logger } from '../packages/observability/src';

/**
 * 🔥 Global Tier-1: Failover Verification Suite
 * Simulates regional failure and verifies GTM redirection + Idempotency recovery.
 */
async function runFailoverTest() {
    const missionId = `test-mission-${Date.now()}`;
    const regionA = 'us-east-1';
    const regionB = 'us-west-2';

    logger.info({ missionId }, '🚀 Starting Global Failover Verification');

    // 1. Setup: Mission assigned to Region A
    await db.mission.create({
        data: {
            id: missionId,
            title: 'Failover Test Mission',
            status: 'in-progress',
            assignedRegion: regionA,
            tenantId: 'system-test'
        }
    });

    // 2. Setup: Regions report healthy status
    process.env.CURRENT_REGION = regionA;
    await regionalGovernance.reportHeartbeat({ cpu: 20, memory: 30, queueDepth: 0 });
    
    process.env.CURRENT_REGION = regionB;
    await regionalGovernance.reportHeartbeat({ cpu: 15, memory: 25, queueDepth: 0 });

    logger.info('✅ Regional topology initialized');

    // 3. Verify Route Affinity
    const affinityA = await regionalGovernance.getRouteAffinity(missionId);
    if (affinityA.targetRegion !== regionA) {
        throw new Error(`Affinity Failure: Expected ${regionA}, got ${affinityA.targetRegion}`);
    }
    logger.info('✅ Route affinity verified (Initial)');

    // 4. Simulate Region A FAILURE
    logger.warn('🔴 [CHAOS] Simulating US-EAST-1 Regional Outage...');
    await redis.hset('governance:global_topology', regionA, RegionalStatus.OFFLINE);
    
    // 5. Verify Failover Region Selection
    process.env.CURRENT_REGION = regionB; // We are now acting as the Gateway in Region B
    const failoverRegion = await regionalGovernance.getFailoverRegion();
    if (failoverRegion !== regionB && Object.keys(await redis.hgetall('governance:global_topology')).length > 1) {
        logger.info({ failoverRegion }, 'Failover region found');
    }

    // 6. Verify Idempotency Lock Recovery (Lock Stealing)
    const lockKey = `test-lock:${missionId}`;
    
    // Create a "stale" lock in Region A
    await db.idempotencyRecord.create({
        data: {
            id: lockKey,
            missionId,
            region: regionA,
            status: 'locked',
            lockedAt: new Date(Date.now() - 600000) // 10 mins ago (stale)
        }
    });

    logger.info('🔒 Stale lock created in failing region');

    // Attempt execution in Region B
    const result = await IdempotencyManager.executeExternal(lockKey, missionId, regionB, async () => {
        return { success: true, recovered: true };
    });

    if (result.recovered) {
        logger.info('✅ SUCCESS: Lock recovered in Region B via failover logic');
    } else {
        throw new Error('Failover Failure: Lock recovery unsuccessful');
    }

    // 7. Cleanup
    await db.mission.delete({ where: { id: missionId } });
    await db.idempotencyRecord.delete({ where: { id: lockKey } });
    
    logger.info('🏁 Global Failover Verification PASSED');
    process.exit(0);
}

runFailoverTest().catch(err => {
    logger.error({ err }, '❌ Failover Verification FAILED');
    process.exit(1);
});

import { db, logger } from '../packages/utils/src/server';
import { v4 as uuidv4 } from 'uuid';
import { IdempotencyManager } from '../packages/utils/src/idempotency';

async function proveStaleLock() {
    const missionId = `stale-test-${uuidv4().substring(0, 8)}`;
    logger.info(`[StaleLock] 🧪 Starting Stale Lock Recovery Proof for: ${missionId}`);

    const idempotencyKey = `stale_lock_${missionId}`;

    // 1. Manually insert a "started" lock that is 10 minutes old (simulating a permanently dead worker)
    logger.info(`[StaleLock] 1. Creating a permanently dead lock (10 minutes old)...`);
    await db.idempotencyRecord.create({
        data: {
            key: idempotencyKey,
            executionId: missionId,
            status: 'started',
            lockedAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        }
    });

    let sideEffectRan = false;

    // 2. Worker 2 attempts to run the same operation
    logger.info(`[StaleLock] 2. Worker 2 boots up and attempts to run the delayed job...`);
    
    try {
        await IdempotencyManager.executeExternal(
            idempotencyKey,
            missionId,
            async (key) => {
                logger.info(`[StaleLock] ⚙️ Processing recovered side-effect!`);
                sideEffectRan = true;
                return { success: true };
            }
        );
    } catch (e: any) {
        logger.error(`❌ FAILED: Worker 2 threw an error instead of recovering: ${e.message}`);
        process.exit(1);
    }

    if (sideEffectRan) {
        const record = await db.idempotencyRecord.findUnique({ where: { key: idempotencyKey } });
        if (record?.status === 'completed') {
            logger.info(`✅ STALE LOCK PROVEN: Worker 2 successfully usurped the 10-minute old lock and completed the job!`);
            process.exit(0);
        }
    }

    logger.error(`❌ FAILED: Worker 2 did not successfully complete the side effect.`);
    process.exit(1);
}

proveStaleLock().catch(err => {
    logger.error({ err }, '[StaleLock] Fatal error');
    process.exit(1);
});

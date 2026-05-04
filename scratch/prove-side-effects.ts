import { QueueManager, db, logger, redis } from '../packages/utils/src/server';
import { v4 as uuidv4 } from 'uuid';
import { IdempotencyManager } from '../packages/utils/src/idempotency';

async function proveSideEffects() {
    const missionId = `side-effect-test-${uuidv4().substring(0, 8)}`;
    logger.info(`[SideEffects] 🧪 Starting Side-Effect Idempotency Proof for: ${missionId}`);

    // 1. Create a dummy mission in DB
    await db.mission.create({
        data: {
            id: missionId,
            title: `Side Effect Simulation`,
            status: 'queued',
            tenantId: 'system',
            metadata: {
                projectId: 'test-project',
                userId: 'integrity-tester',
                prompt: `Test side effects`
            }
        }
    });

    const idempotencyKey = `billing_charge_${missionId}`;
    let sideEffectExecutions = 0;

    // Simulate the worker function running
    const workerSimulation = async (isCrashRun: boolean) => {
        try {
            await IdempotencyManager.executeExternal(
                idempotencyKey,
                missionId,
                async () => {
                    logger.info(`[SideEffects] ⚙️ Processing side-effect (e.g. DB write or Stripe charge)`);
                    sideEffectExecutions++;
                    
                    // Simulate processing time
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return { charged: true, amount: 50 };
                }
            );

            if (isCrashRun) {
                logger.error(`[SideEffects] 💥 FATAL CRASH after side effect, but BEFORE job completion!`);
                throw new Error('SIMULATED_WORKER_CRASH');
            }

        } catch (err: any) {
            if (err.message === 'SIMULATED_WORKER_CRASH') throw err;
            logger.warn(`[SideEffects] Caught idempotency rejection: ${err.message}`);
        }
    };

    logger.info(`[SideEffects] Attempt 1: Worker starts processing but crashes mid-way...`);
    try {
        await workerSimulation(true);
    } catch (e) {
        logger.info(`[SideEffects] Worker 1 successfully crashed.`);
    }

    logger.info(`[SideEffects] Attempt 2: BullMQ retries the job on a new worker instance...`);
    await workerSimulation(false);

    logger.info(`[SideEffects] Attempt 3: A duplicate delayed message arrives for the same job...`);
    await workerSimulation(false);

    logger.info(`[SideEffects] Validation Phase:`);
    logger.info(`[SideEffects] Total times the actual side-effect code ran: ${sideEffectExecutions}`);

    // Check DB record
    const record = await db.idempotencyRecord.findUnique({ where: { key: idempotencyKey } });
    
    if (sideEffectExecutions === 1 && record?.status === 'completed') {
        logger.info(`✅ SIDE-EFFECT IDEMPOTENCY PROVEN: The side effect executed EXACTLY ONCE despite crashes and retries.`);
        logger.info(`[SideEffects] DB Record: ${JSON.stringify(record)}`);
        process.exit(0);
    } else {
        logger.error(`❌ IDEMPOTENCY FAILED: Side effect executed ${sideEffectExecutions} times. DB Status: ${record?.status}`);
        process.exit(1);
    }
}

proveSideEffects().catch(err => {
    logger.error({ err }, '[SideEffects] Fatal error');
    process.exit(1);
});

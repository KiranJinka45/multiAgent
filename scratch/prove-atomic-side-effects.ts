import { db, logger } from '../packages/utils/src/server';
import { v4 as uuidv4 } from 'uuid';
import { IdempotencyManager } from '../packages/utils/src/idempotency';

async function proveAtomicSideEffects() {
    const missionId = `atomic-test-${uuidv4().substring(0, 8)}`;
    logger.info(`[AtomicProof] 🧪 Starting Atomic Idempotency Proof for: ${missionId}`);

    // Create a dummy mission in DB
    await db.mission.create({
        data: {
            id: missionId,
            title: `Atomic Simulation`,
            status: 'queued',
            tenantId: 'system',
            metadata: { projectId: 'test-project', userId: 'integrity-tester', prompt: `Test atomic effects` }
        }
    });

    const idempotencyKey = `atomic_write_${missionId}`;

    const workerSimulation = async (crashDuringCommit: boolean) => {
        try {
            await IdempotencyManager.executeDbAtomic(
                idempotencyKey,
                missionId,
                async (tx) => {
                    logger.info(`[AtomicProof] ⚙️ Processing DB side-effect (transaction bound)`);
                    
                    // Simulate an internal DB write that MUST be atomic with the idempotency check
                    await tx.mission.update({
                        where: { id: missionId },
                        data: { status: 'planning' }
                    });

                    if (crashDuringCommit) {
                        logger.error(`[AtomicProof] 💥 FATAL CRASH before Postgres transaction commits!`);
                        throw new Error('SIMULATED_DB_CRASH');
                    }

                    return { success: true, updated: true };
                }
            );
        } catch (err: any) {
            if (err.message === 'SIMULATED_DB_CRASH') throw err;
            logger.warn(`[AtomicProof] Caught rejection: ${err.message}`);
        }
    };

    logger.info(`[AtomicProof] Attempt 1: Worker executes DB change, but crashes BEFORE the commit finishes...`);
    try {
        await workerSimulation(true);
    } catch (e) {
        logger.info(`[AtomicProof] Worker 1 successfully crashed.`);
    }

    logger.info(`[AtomicProof] Verifying DB state after rollback...`);
    const rolledBackMission = await db.mission.findUnique({ where: { id: missionId } });
    if (rolledBackMission?.status === 'planning') {
        logger.error(`❌ ATOMICITY FAILED: Mission status updated to 'planning' despite transaction rollback!`);
        process.exit(1);
    }
    logger.info(`[AtomicProof] ✅ Mission status is safely '${rolledBackMission?.status}', meaning the side-effect rolled back.`);

    logger.info(`[AtomicProof] Attempt 2: BullMQ retries the job on a new worker instance...`);
    await workerSimulation(false);

    logger.info(`[AtomicProof] Validation Phase:`);
    const completedMission = await db.mission.findUnique({ where: { id: missionId } });
    const record = await db.idempotencyRecord.findUnique({ where: { key: idempotencyKey } });
    
    if (completedMission?.status === 'planning' && record?.status === 'completed') {
        logger.info(`✅ ATOMIC IDEMPOTENCY PROVEN: The side effect and idempotency status were committed EXACTLY ONCE simultaneously.`);
        process.exit(0);
    } else {
        logger.error(`❌ IDEMPOTENCY FAILED: DB state invalid. Mission: ${completedMission?.status}, Idemp: ${record?.status}`);
        process.exit(1);
    }
}

proveAtomicSideEffects().catch(err => {
    logger.error({ err }, '[AtomicProof] Fatal error');
    process.exit(1);
});

import { QueueManager, db, logger, redis } from '../packages/utils/src/server';
import { v4 as uuidv4 } from 'uuid';

async function proveIdempotency() {
    const queueName = 'free_queue';
    const queue = QueueManager.getQueue(queueName);

    logger.info('[Idempotency] 🧪 Starting Idempotency Proof...');

    const missionId = `idempotency-test-${uuidv4().substring(0, 8)}`;
    const totalSubmissions = 10;

    // 1. Create a dummy mission in DB
    await db.mission.create({
        data: {
            id: missionId,
            title: `Idempotency Test`,
            status: 'queued',
            tenantId: 'system',
            metadata: {
                projectId: 'test-project',
                userId: 'integrity-tester',
                prompt: `Double-click simulation`
            }
        }
    });

    // 2. Submit 10 identical jobs concurrently (simulating spam clicks)
    logger.info(`[Idempotency] Submitting ${totalSubmissions} identical payloads for mission: ${missionId}`);
    
    const submissions = Array.from({ length: totalSubmissions }).map(() => {
        return QueueManager.add(queueName, {
            id: missionId,
            executionId: missionId,
            prompt: `Double-click simulation`,
            userId: 'integrity-tester',
            projectId: 'test-project',
            tenantId: 'system'
        }, { jobId: missionId }); // The crucial jobId option for BullMQ deduplication
    });

    await Promise.allSettled(submissions);

    // 3. Measure how many jobs actually entered BullMQ
    const jobInQueue = await queue.getJob(missionId);
    
    // We can also count total jobs added recently or check queue length
    const active = await queue.getActiveCount();
    const waiting = await queue.getWaitingCount();
    const delayed = await queue.getDelayedCount();
    const totalInSystem = active + waiting + delayed;

    logger.info(`[Idempotency] Submission complete.`);
    logger.info(`[Idempotency] Total Jobs added: ${totalInSystem} (Expected: 1)`);

    if (totalInSystem > 1) {
        logger.error(`❌ IDEMPOTENCY FAILED: Multiple jobs detected in queue!`);
        process.exit(1);
    }

    logger.info(`[Idempotency] Waiting for worker to process the job...`);

    // 4. Wait for it to complete
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 150) {
        const mission = await db.mission.findUnique({ where: { id: missionId } });
        if (mission?.status?.toLowerCase() === 'completed' || mission?.status?.toLowerCase() === 'failed') {
            completed = true;
            logger.info(`[Idempotency] Job reached terminal state: ${mission.status}`);
        } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }
    }

    // 5. Verify worker execution count using Redis Lock or Event Stream
    const streamKey = `build:stream:${missionId}`;
    const { eventBus: realEventBus } = require('../packages/events/src/index');
    const streamLogs = await realEventBus.replayStream(streamKey, '-', '+');
    
    // We expect exactly ONE 'Analyzing requirements and generating task graph' event in the 'plan' stage
    const startEvents = streamLogs.filter((log: any) => log.data.stage === 'plan' && log.data.message.includes('Analyzing requirements'));
    
    logger.info(`[Idempotency] Execution Start Events Detected: ${startEvents.length}`);

    if (startEvents.length === 1) {
        logger.info(`✅ IDEMPOTENCY PROVEN: The system rejected duplicate submissions and executed the job exactly once.`);
        process.exit(0);
    } else {
        logger.error(`❌ IDEMPOTENCY FAILED: Job executed ${startEvents.length} times!`);
        logger.info(`[Idempotency] Captured Events: ${JSON.stringify(streamLogs, null, 2)}`);
        process.exit(1);
    }
}

proveIdempotency().catch(err => {
    logger.error({ err }, '[Idempotency] Fatal error');
    process.exit(1);
});

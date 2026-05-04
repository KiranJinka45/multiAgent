import { QueueManager, db, logger } from '../../packages/utils/src/server';
import Redis from 'ioredis';
import { execSync, spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

/**
 * PRODUCTION INTEGRITY CERTIFICATION SUITE
 */
async function runIntegrityPass() {
    // Force direct connection for the test runner to avoid sentinel advertised IP issues
    const redisDirect = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    
    // Patch QueueManager to use our direct connection for this test
    (QueueManager as any).getQueue = (name: string) => {
        const { Queue } = require('bullmq');
        return new Queue(name, { connection: redisDirect });
    };

    const totalJobs = 10;
    const missionIds: string[] = [];
    const queueName = 'free_queue'; 
    const queue = QueueManager.getQueue(queueName);

    logger.info(`[Integrity] 🧪 Starting Production Integrity Pass (${totalJobs} jobs)`);

    // 1. Submit Jobs
    for (let i = 0; i < totalJobs; i++) {
        const id = `mission-integrity-${uuidv4().substring(0, 8)}`;
        missionIds.push(id);
        
        // 0. Create mission in DB first so worker can update it
        await db.mission.create({
            data: {
                id,
                title: `Integrity Job ${i}`,
                status: 'queued',
                tenantId: 'system',
                metadata: {
                    projectId: 'test-project',
                    userId: 'integrity-tester',
                    prompt: `Integrity Test Job ${i}`
                },
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        await QueueManager.add(queueName, {
            id,
            executionId: id, 
            prompt: `Integrity Test Job ${i}`,
            userId: 'integrity-tester',
            projectId: 'test-project',
            tenantId: 'system'
        }, { jobId: id }); 
    }

    logger.info(`[Integrity] Submitted ${totalJobs} jobs. Injecting chaos...`);

    // 2. Inject Chaos (Kill Worker)
    try {
        const killCmd = `wmic process where "commandline like '%apps/worker%'" delete`;
        execSync(killCmd);
        logger.info('[Integrity] 💀 Worker killed mid-flight.');
    } catch (e) {
        logger.warn('[Integrity] Worker already dead or not found.');
    }

    // 3. Restart Worker
    logger.info('[Integrity] 🚀 Restarting worker to verify recovery...');
    const workerProcess = spawn('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'apps/worker/src/index.ts'], {
        stdio: 'inherit',
        shell: true,
        detached: true
    });
    workerProcess.unref();

    // 4. Poll for Completion
    let completedCount = 0;
    let failedCount = 0;
    const timeout = 150000; // 150s timeout to allow orphaned execution recovery
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const completed = await queue.getCompletedCount();
        const failed = await queue.getFailedCount();
        
        // We only care about OUR jobs, but for a clean env, counts should match
        // In a shared env, we'd check specific missionId status in DB
        const terminalMissions = await db.mission.findMany({
            where: {
                id: { in: missionIds },
                status: { in: ['completed', 'failed', 'COMPLETED', 'FAILED'] }
            }
        });

        if (terminalMissions.length === totalJobs) {
            completedCount = terminalMissions.filter(m => m.status.toLowerCase() === 'completed').length;
            failedCount = terminalMissions.filter(m => m.status.toLowerCase() === 'failed').length;
            break;
        }

        logger.info(`[Integrity] Progress: ${terminalMissions.length}/${totalJobs} completed...`);
        await new Promise(r => setTimeout(r, 5000));
    }

    // 5. Final Assertions
    logger.info('--- 📊 INTEGRITY REPORT ---');
    logger.info(`Total Submitted: ${totalJobs}`);
    logger.info(`Total Terminal:  ${completedCount + failedCount}`);
    
    if (completedCount + failedCount !== totalJobs) {
        logger.error('❌ JOB LOSS DETECTED! Integrity check failed.');
        process.exit(1);
    } else {
        logger.info('✅ ZERO JOB LOSS verified.');
    }

    // 6. Trace Verification (Sample one)
    const sampleMission = missionIds[0];
    const logs = await db.executionLog.findMany({
        where: { executionId: sampleMission }
    });

    if (logs.length > 0) {
        logger.info(`✅ TRACE CONTINUITY: Found ${logs.length} logs for mission ${sampleMission}`);
    } else {
        logger.warn('⚠️ No logs found for trace verification.');
    }

    logger.info('--- 🏁 Integrity Pass Complete ---');
    process.exit(0);
}

runIntegrityPass().catch(err => {
    console.error('Integrity Pass Fatal:', err);
    process.exit(1);
});

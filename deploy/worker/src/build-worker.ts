console.log('🚀 WORKER BOOT: Loading entries...');
import 'dotenv/config';
import { initInstrumentation } from './instrumentation';

import fs from 'fs-extra';
import path from 'path';
import { Worker, Job } from '@packages/utils';
import { redis } from '@packages/utils';
import { QUEUE_FREE, QUEUE_PRO } from '@packages/utils';
import { logger } from '@packages/observability';
import { Orchestrator } from '@packages/core-engine';
import { 
    runWithTracing, 
    queueWaitTimeSeconds, 
    stuckBuildsTotal, 
    env, 
    missionController, 
    eventBus, 
    ReliabilityMonitor, 
    RedisRecovery,
    PreviewOrchestrator,
    RuntimeCleanup,
    BuildCacheManager,
    BuildGraphEngine,
    JobStage,
    MissionStatus,
    ArtifactValidator,
    WorkerClusterManager,
    FailoverManager,
    NodeRegistry,
    EvolutionManager
} from '@packages/utils';

import os from 'os';

console.log('✅ WORKER BOOT: All imports resolved successfully');
console.log('STEP 1: Starting Worker boot sequence...');

const WORKER_ID = `worker-${os.hostname()}-${process.pid}`;
const orchestrator = new Orchestrator();
const workerId = `worker-${Math.random().toString(36).substring(2, 9)}`;

// Redis Connectivity Trace
console.log('STEP 2: Initializing Redis connection (Shared)...');
redis.on('connect', () => console.log('🔗 Redis: Connecting...'));
redis.on('ready', () => console.log('✅ Redis: Connection established and ready.'));
redis.on('error', (err: Error) => console.error('❌ Redis: Connection error:', err.message));

// 💓 Heartbeat handles both Cluster Registration and Orchestration Health
const HEARTBEAT_INTERVAL = 5000;
setInterval(async () => {
    try {
        const payload = {
            workerId: WORKER_ID,
            hostname: os.hostname(),
            load: 0, // TODO: Map to actual CPU/Job load
            status: 'IDLE' as const,
            memory: process.memoryUsage().heapUsed / 1024 / 1024,
            uptime: process.uptime()
        };

        // 1. Update Cluster Manager (For steering & pruning)
        await WorkerClusterManager.heartbeat(payload);

        // 2. Update Legacy Health Key (For system-startup.cjs compatibility)
        await redis.set('system:health:worker', JSON.stringify({ ...payload, status: 'online' }), 'EX', 15);
    } catch (err) {
        logger.warn({ err: (err as Error).message }, '[Worker] Heartbeat sync failed');
    }
}, HEARTBEAT_INTERVAL);

console.log('STEP 4: Background task initialization started.');

const RECOVERY_STALE_MS = 60000;
const resumeOrphanedExecutions = async () => {
    logger.info('Scanning for orphaned missions to resume...');
    try {
        const activeMissions = await missionController.listActiveMissions();
        const activeHeartbeatKeys = await redis.keys('worker:heartbeat:*');
        const activeWorkerIds = new Set(activeHeartbeatKeys.map(k => k.split(':').pop()));
        
        for (const mission of activeMissions) {
            const missionWorkerId = mission.metadata?.workerId;
            const isStale = Date.now() - mission.updatedAt > RECOVERY_STALE_MS;
            const isOwnerDead = missionWorkerId && !activeWorkerIds.has(missionWorkerId as string);

            if (isStale || isOwnerDead) {
                logger.info({ 
                    missionId: mission.id, 
                    status: mission.status,
                    isStale,
                    isOwnerDead 
                }, 'Resuming orphaned mission...');
                stuckBuildsTotal.inc();

                executeBuild({
                    prompt: mission.prompt,
                    userId: mission.userId,
                    projectId: mission.projectId,
                    executionId: mission.id,
                    isFastPreview: !!mission.metadata?.fastPath
                }).catch(err => logger.error({ err, missionId: mission.id }, 'Failed to resume orphaned mission'));
            }
        }
    } catch (err) {
        logger.error({ err }, 'Error during orphaned mission scan');
    }
};

// Set periodic recovery
setInterval(resumeOrphanedExecutions, 60_000);

const executeBuild = async (data: { prompt: string, userId: string, projectId: string, executionId: string, isFastPreview?: boolean }, job?: Job) => {
    const { prompt, userId, projectId, executionId, isFastPreview } = data;
    const tier = job ? (job.queueName.includes('pro') ? 'pro' : 'free') : 'instant';

    // 🔒 Single Job Processing Guard (Shared between Queue & Instant Trigger)
    const lockKey = `build:lock:${executionId}`;
    const lock = await redis.set(lockKey, executionId, 'EX', 600, 'NX');

    if (!lock) {
        if (job) logger.warn({ executionId, jobId: job.id, tier }, 'Duplicate execution (Queue) detected. Skipping.');
        return;
    }

    const controller = new AbortController();

    // Record queue wait time if it's a job
    if (job) {
        const waitTime = (Date.now() - job.timestamp) / 1000;
        queueWaitTimeSeconds.observe({ queue_name: tier }, waitTime);
    }

    // --- Auto-Lock-Extension Mechanism ---
    const lockExtensionInterval = setInterval(async () => {
        try {
            // Extend BullMQ lock if job exists
            if (job && await job.isActive()) {
                // Increased extension to 5 minutes for safety during heavy builds
                await job.extendLock(job.token!, 300000);
            }

            // Verify execution ownership in Redis
            const owner = await redis.get(lockKey);
            if (owner !== executionId) {
                throw new Error('Execution lock ownership lost (Heartbeat Violation)');
            }

            // Extend Redis lock
            await redis.expire(lockKey, 600);

            logger.debug({ executionId, tier }, 'Execution locks extended (Heartbeat)');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error({ executionId, error: errorMessage, tier }, 'CRITICAL: Lock heartbeat failed. Aborting.');
            controller.abort();
        }
    }, 30000);

    const startTime = Date.now();
    try {
        await missionController.updateMission(executionId, { 
            status: 'planning',
            metadata: { workerId } 
        });
        
        // --- BUILD TIMEOUT GUARD (Fix 9) ---
        const BUILD_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
        const timeout = setTimeout(() => {
            logger.error({ executionId }, '[Worker] Build timeout reached. Aborting.');
            controller.abort();
        }, BUILD_TIMEOUT_MS);
        // ------------------------------------

        return await runWithTracing(executionId, async () => {
            logger.info({ executionId, userId, projectId, tier }, 'Worker entering executeBuild loop');
            
            const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
            await fs.ensureDir(sandboxDir);

            // --- CACHE RESTORATION PHASE ---
            const cacheRestored = await BuildCacheManager.restore(projectId, sandboxDir);
            if (cacheRestored) {
                logger.info({ projectId }, '[Worker] Incremental build: Cache restored successfully');
                await eventBus.stage(executionId, JobStage.PLAN.toLowerCase(), 'completed', 'Incremental build: Restored previous build cache', 20, projectId);
                
                // --- GRAPH ANALYSIS PHASE ---
                const affectedNodes = await BuildGraphEngine.getAffectedNodes(sandboxDir);
                if (affectedNodes.length === 0) {
                    logger.info({ projectId }, '[Worker] Zero affected nodes. Skipping full build.');
                    await eventBus.stage(executionId, JobStage.PLAN.toLowerCase(), 'completed', 'No changes detected. Reusing existing artifacts.', 30, projectId);
                    // We could return early here if the system supports artifact injection only
                } else {
                    logger.info({ projectId, count: affectedNodes.length }, '[Worker] Partial changes detected');
                }
            }
            
            try {
                const result = await (orchestrator as any).execute(
                    prompt,
                    userId,
                    projectId,
                    executionId,
                    controller.signal,
                    { isFastPreview }
                );
                
                clearTimeout(timeout); // Success - clear timeout

                if (result && !result.success) {
                    const errorResult = result as { error: string };
                    throw new Error(errorResult.error || 'Build failed');
                }

            // 🛡️ FINAL INTEGRITY WATCHDOG
            const validationResult = await ArtifactValidator.validate(projectId);
            if (!validationResult.valid) {
                const error = `Build integrity failure: Missing ${validationResult.missingFiles?.join(', ') || 'critical files'}`;
                logger.error({ projectId, missing: validationResult.missingFiles }, '[Worker] Integrity Check FAILED');
                throw new Error(error);
            }
            logger.info({ projectId }, '[Worker] Integrity Check PASSED');

            // --- CACHE SAVE PHASE ---
            await BuildCacheManager.save(projectId, sandboxDir);

            await missionController.updateMission(executionId, { status: 'completed' as MissionStatus });


            const durationMs = Date.now() - startTime;
            await ReliabilityMonitor.recordSuccess(durationMs);

                return result;
            } catch (err) {
                clearTimeout(timeout);
                throw err;
            }
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error({ executionId, error: msg, tier }, 'Execution failed');

        // --- SELF-EVOLUTION HIJACK ---
        try {
            const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
            if (fs.existsSync(sandboxDir)) {
                // Collect context for evolution
                const entries = await fs.readdir(sandboxDir);
                const files: { path: string, content: string }[] = [];
                for (const e of entries.slice(0, 5)) { // Limit to top 5 files for context
                    const fPath = path.join(sandboxDir, e);
                    if ((await fs.stat(fPath)).isFile() && (e.endsWith('.ts') || e === 'package.json')) {
                        files.push({ path: e, content: await fs.readFile(fPath, 'utf8') });
                    }
                }

                const evolved = await EvolutionManager.evolve(executionId, msg, files);
                if (evolved) {
                    logger.info({ executionId }, '[Worker] Self-evolution initiated. Skipping failure state.');
                    return; // Mission will be re-queued by EvolutionManager
                }
            }
        } catch (evoErr) {
            logger.error({ executionId, err: (evoErr as Error).message }, '[Worker] Self-evolution trigger failed');
        }

        await missionController.updateMission(executionId, { 
            status: 'failed',
            metadata: { error: msg }
        });

        await eventBus.stage(executionId, JobStage.FAILED.toLowerCase(), 'failed', `Build failed: ${msg}`, 100, projectId);
        await eventBus.error(executionId, `[BuildWorker] ${msg}`, projectId);
        await ReliabilityMonitor.recordFailure();
        
        throw error;
    } finally {
        clearInterval(lockExtensionInterval);
    }
};

const processJob = async (job: Job) => {
    return await executeBuild(job.data, job);
};

// 1. Initialize Tiers
if (!QUEUE_FREE) throw new Error("FATAL: QUEUE_FREE name must be provided");
if (!QUEUE_PRO) throw new Error("FATAL: QUEUE_PRO name must be provided");

const freeWorker = new Worker(QUEUE_FREE, processJob, {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY_FREE || 5,
    lockDuration: 300000, // 5 minute initial lock
    limiter: {
        max: 5, // Process max 5 jobs per second per worker instance
        duration: 1000
    }
});

const proWorker = new Worker(QUEUE_PRO, processJob, {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY_PRO || 20,
    lockDuration: 300000, // 5 minute initial lock
    limiter: {
        max: 10,
        duration: 1000
    }
});

const setupWorkerEvents = (worker: Worker, name: string) => {
    worker.on('completed', (job: Job) => {
        logger.info({ jobId: job.id, worker: name }, 'Job completed');
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
        logger.error({ jobId: job?.id, worker: name, err: err.message }, 'Job failed');
    });
};

setupWorkerEvents(freeWorker, 'free');
setupWorkerEvents(proWorker, 'pro');

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down workers...');
    try {
        await WorkerClusterManager.deregister(WORKER_ID);
        FailoverManager.stop();
        await RuntimeCleanup.shutdownAll();
        await NodeRegistry.deregister();
        await Promise.all([freeWorker.close(), proWorker.close()]);
        await redis.quit();
    } catch (err) {
        logger.error({ err }, 'Shutdown cleanup partial failure');
    }
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// --- Consolidated Heartbeat above at line 49 ---

// Cluster & Instant Trigger Listeners
(async () => {
    try {
        const sub = redis.duplicate();
        // ioredis handles connection automatically
        
        logger.info({ workerId: WORKER_ID }, '[Worker] Subscribing to direct steering channel');
        
        await sub.subscribe(`worker:trigger:${WORKER_ID}`);
        
        sub.on('message', async (channel, message) => {
            if (channel !== `worker:trigger:${WORKER_ID}`) return;
            try {
                const { projectId } = JSON.parse(message);
                logger.info({ projectId }, '[Worker] Direct job steering received! Triggering execution.');
            } catch (pErr) {
                logger.error({ err: pErr }, '[Worker] Failed to parse steering message');
            }
        });
    } catch (err) {
        const error = err as Error;
        logger.error({ err: error.message }, '[Worker] Direct steering listener failed');
    }
})();

(async () => {
    try {
        const nodeId = await NodeRegistry.register();
        logger.info({ nodeId }, 'Node registered in cluster');
        FailoverManager.start();

        const sub = redis.duplicate();
        await sub.subscribe('cluster:schedule:assign', 'cluster:node:restart', 'build:init:trigger');

        sub.on('message', async (channel: string, message: string) => {
            try {
                const data = JSON.parse(message);

                if (channel === 'build:init:trigger') {
                    logger.info({ executionId: data.executionId }, '⚡ Instant Trigger received. Initiating build...');
                    // Fire and forget so we don't block the sub loop
                    executeBuild(data).catch(err => logger.error({ err, executionId: data.executionId }, 'Instant Trigger execution failed'));
                } else if (channel === 'cluster:schedule:assign') {
                    if (data.targetNodeId === nodeId) {
                        logger.info({ projectId: data.request.projectId }, '[Worker] Picking up assigned runtime');
                        PreviewOrchestrator.start(
                            data.request.projectId,
                            data.request.executionId,
                            data.request.userId
                        ).catch((err: unknown) => {
                            const error = err instanceof Error ? err.message : String(err);
                            logger.error({ err: error, projectId: data.request.projectId }, 'Failed to start assigned runtime');
                        });
                    }
                } else if (channel === 'cluster:node:restart') {
                    if (data.nodeId === nodeId) {
                        logger.warn({ reason: data.reason }, '[Worker] Received restart signal. Shutting down gracefully...');
                        await shutdown();
                    }
                }
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                logger.error({ error: errMsg }, `[Worker] Error processing message on channel ${channel}`);
            }
        });

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ error: errMsg }, 'Failed to register node in cluster (non-fatal, running in standalone mode)');
    }
})();

console.log('STEP 5: Workers created. Listening for jobs.');
logger.info(`Workers started: Free (concurrency=${freeWorker.opts.concurrency}), Pro (concurrency=${proWorker.opts.concurrency})`);
console.log(`✅ WORKER BOOT: BullMQ Workers created — Free (${freeWorker.opts.concurrency}), Pro (${proWorker.opts.concurrency})`);

// Kick off crash recovery
resumeOrphanedExecutions();

// Start background preview cleanup
RuntimeCleanup.start();

// Redis connection error handling & auto-recovery
redis.on('error', (err: Error) => {
    logger.error({ err: err.message }, '[Worker] Redis connection error');
    if ('code' in err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        RedisRecovery.handleRedisCrash().catch(recErr => {
            logger.error({ err: recErr.message }, '[Worker] Critical recovery failure');
        });
    }
});


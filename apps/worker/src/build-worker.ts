import 'dotenv/config';

import { initInstrumentation } from './instrumentation';

import fs from 'fs-extra';
import path from 'path';
import { Worker, Job } from 'bullmq';

import { redis } from '@packages/utils';
import { QUEUE_FREE, QUEUE_PRO } from '@packages/utils';
import { logger, jobTotal, jobRetriesTotal, jobProcessingDurationSeconds, activeWorkers } from '@packages/observability';
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
    IdempotencyManager,
    BuildCacheManager,
    BuildGraphEngine,
    JobStage,
    MissionStatus,
    ArtifactValidator,
    WorkerClusterManager,
    FailoverManager,
    NodeRegistry,
    EvolutionManager,
    ControlPlane,
    ControlPlaneMetrics
} from '@packages/utils';
import { PreviewOrchestrator, RuntimeCleanup } from '@packages/sandbox-runtime';

import os from 'os';



const WORKER_ID = `worker-${os.hostname()}-${process.pid}`;
const orchestrator = new Orchestrator();
const workerId = `worker-${Math.random().toString(36).substring(2, 9)}`;

// Redis Connectivity Trace
redis.on('connect', () => logger.info('🔗 Redis: Connecting...'));
redis.on('ready', () => logger.info('✅ Redis: Connection established and ready.'));
redis.on('error', (err: Error) => logger.error({ err: err.message }, '❌ Redis: Connection error'));

let rollingLatencyMs = 0;
const LATENCY_ALPHA = 0.2; // Rolling average weight

// 💓 Heartbeat handles both Cluster Registration and Orchestration Health
const HEARTBEAT_INTERVAL = 5000;
setInterval(async () => {
    try {
        // Get queue depths if workers are initialized
        let queueDepth = 0;
        let activeJobs = 0;
        // Temporary fix: Removed invalid queue metrics call to restore heartbeat


        const payload = {
            workerId: WORKER_ID,
            hostname: os.hostname(),
            load: os.loadavg()[0],
            queueDepth,
            activeJobs,
            p95Latency: rollingLatencyMs, // Using rolling average as proxy for p95
            status: (activeJobs > 0 ? 'BUSY' : 'IDLE') as any,
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



const RECOVERY_STALE_MS = 60000;
const resumeOrphanedExecutions = async () => {
    logger.info('Scanning for orphaned missions to resume...');
    try {
        const activeMissions = await missionController.listActiveMissions();
        const activeHeartbeatKeys = await redis.keys('worker:heartbeat:*');
        const activeWorkerIds = new Set(activeHeartbeatKeys.map((k: string) => k.split(':').pop()));
        
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
                    prompt: mission.prompt || mission.description || mission.metadata?.prompt || '',
                    userId: mission.userId || mission.metadata?.userId || 'system',
                    projectId: mission.projectId || mission.metadata?.projectId || 'default',
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

// --- Hard Circuit Breaker for DB ---
let dbErrorCount = 0;
let dbCircuitOpen = false;
let dbCircuitOpenUntil = 0;

const protectedUpdateMission = async (id: string, data: any) => {
    // Distributed Circuit Breaker Check
    const globalState = await redis.get('circuit:db:global');
    if (globalState === 'OPEN') {
        throw new Error('DB unavailable (Global Circuit Open)');
    }

    if (dbCircuitOpen) {
        if (Date.now() < dbCircuitOpenUntil) {
            throw new Error('DB unavailable (Local Circuit Open)');
        } else {
            dbCircuitOpen = false; // Half-open / recovery
        }
    }

    const start = Date.now();
    try {
        const res = await missionController.updateMission(id, data);
        dbErrorCount = Math.max(0, dbErrorCount - 1); // Recover count
        const latency = Date.now() - start;
        if (latency > 500) {
             dbErrorCount++;
        }
        return res;
    } catch (err) {
        dbErrorCount += 2; // Errors weigh more
        if (dbErrorCount > 10) {
            dbCircuitOpen = true;
            dbCircuitOpenUntil = Date.now() + 15000; // Open for 15s
            dbErrorCount = 0;
            // Trip the global circuit breaker
            await redis.set('circuit:db:global', 'OPEN', 'EX', 15);
            logger.error('💥 [Worker] DB Circuit Breaker TRIPPED due to latency/errors (Global state set)');
        }
        throw err;
    }
};

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
        await protectedUpdateMission(executionId, { 
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
            if (process.env.STRESS_DELAY) {
                logger.info({ executionId }, '[Worker] STRESS_DELAY active: sleeping 5s...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
            await fs.ensureDir(sandboxDir);

            // --- CHAOS SIMULATION POINTS ---
            if (process.env.CHAOS_STAGE === 'planning') {
                logger.warn({ executionId }, '💥 [CHAOS] Simulated failure at PLANNING stage');
                throw new Error('CHAOS_PLANNING_FAILURE');
            }

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
                const result = await IdempotencyManager.executeExternal(
                    `build_side_effects_${executionId}`,
                    executionId,
                    process.env.CURRENT_REGION || 'us-east-1',
                    async () => {
                        return await (orchestrator as any).execute(
                            prompt,
                            userId,
                            projectId,
                            executionId,
                            controller.signal,
                            { isFastPreview }
                        );
                    }
                );
                
                clearTimeout(timeout); // Success - clear timeout

                if (result && !(result as any).success) {
                    const errorResult = result as { error: string };
                    throw new Error(errorResult.error || 'Build failed');
                }

            // --- CHAOS SIMULATION: VALIDATION ---
            if (process.env.CHAOS_STAGE === 'validation') {
                logger.warn({ executionId }, '💥 [CHAOS] Simulated failure at VALIDATION stage');
                throw new Error('CHAOS_VALIDATION_FAILURE');
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

            await protectedUpdateMission(executionId, { status: 'completed' as MissionStatus });


            const durationMs = Date.now() - startTime;
            const durationSec = durationMs / 1000;
            rollingLatencyMs = (rollingLatencyMs * (1 - LATENCY_ALPHA)) + (durationMs * LATENCY_ALPHA);
            jobTotal.inc({ status: 'success', tier });
            jobProcessingDurationSeconds.observe({ job_name: 'build', status: 'success' }, durationSec);
            await ControlPlaneMetrics.recordJobResult(redis, 'success');
            await ControlPlaneMetrics.recordLatencyP95(redis, durationMs);
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

        // DB Failure Degraded Mode: Do not burn retry budget for internal DB circuit breaker failures
        if (msg.includes('DB unavailable (Global Circuit Open)')) {
            logger.warn({ executionId }, '⏸️ [Worker] Deferring job due to DB Degraded Mode (No retry budget burned)');
            throw error; // Let BullMQ delay the retry natively without burning Control Plane rate
        }

        const isLastAttempt = job ? (job.attemptsMade + 1 >= (job.opts.attempts || 1)) : true;

        if (isLastAttempt) {
            jobTotal.inc({ status: 'failed', tier });
            const durationMs = Date.now() - startTime;
            jobProcessingDurationSeconds.observe({ job_name: 'build', status: 'failed' }, durationMs / 1000);
            await ControlPlaneMetrics.recordJobResult(redis, 'failed');
            await protectedUpdateMission(executionId, { 
                status: 'failed',
                metadata: { error: msg }
            });

            await eventBus.stage(executionId, JobStage.FAILED.toLowerCase(), 'failed', `Build failed: ${msg}`, 100, projectId);
            await eventBus.error(executionId, `[BuildWorker] ${msg}`, projectId);
            await ReliabilityMonitor.recordFailure();
        } else {
            // Check global retry budget with tenant + tier scope
            const tenantId = data.userId; // Fallback proxy for tenant
            let currentRetryRate = 0;
            try {
                currentRetryRate = await ControlPlaneMetrics.getRetryRate(redis, tenantId, tier);
            } catch (err) {
                logger.warn('💥 [Worker] Redis unreachable, disabling retries locally as fallback');
                currentRetryRate = Infinity; // Force it to drop the job
            }
            
            // Scoped budgets: Premium/Pro get 50/sec, Free gets 10/sec
            const maxRetryRate = tier === 'pro' ? 50 : 10;
            
            if (currentRetryRate > maxRetryRate) {
                logger.error({ executionId, currentRetryRate, tenantId, tier }, '💥 [Worker] Scoped Retry budget exceeded or Redis unreachable. Dropping job immediately.');
                jobTotal.inc({ status: 'failed', tier });
                await ControlPlaneMetrics.recordJobResult(redis, 'failed');
                await protectedUpdateMission(executionId, { 
                    status: 'failed',
                    metadata: { error: `Retry budget exceeded. Final Error: ${msg}` }
                });
                await eventBus.stage(executionId, JobStage.FAILED.toLowerCase(), 'failed', `Build failed (Retry Storm): ${msg}`, 100, projectId);
                await eventBus.error(executionId, `[BuildWorker] ${msg} (Retry Storm dropped)`, projectId);
                throw error; // Fail job instead of retry
            }

            jobRetriesTotal.inc({ tier });
            try {
                await ControlPlaneMetrics.recordRetry(redis);
                await ControlPlaneMetrics.incrementRetryRate(redis, tenantId, tier);
            } catch (err) {
                logger.warn('💥 [Worker] Failed to record retry metrics due to Redis failure, proceeding with local retry logic');
            }
            logger.warn({ executionId, attempt: job?.attemptsMade, maxAttempts: job?.opts.attempts }, 'Execution failed. Retrying via BullMQ...');
            try {
                await protectedUpdateMission(executionId, { 
                    metadata: { error: `Attempt ${job?.attemptsMade} failed: ${msg}` } 
                });
            } catch (err) {
                 logger.warn('💥 [Worker] Failed to update mission in DB due to error, but proceeding with local retry');
            }
        }

        throw error;
    } finally {
        clearInterval(lockExtensionInterval);
        await redis.del(lockKey);
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
    concurrency: Number(env.WORKER_CONCURRENCY_FREE) || 5,
    lockDuration: 300000, // 5 minute initial lock
    limiter: {
        max: 5, // Process max 5 jobs per second per worker instance
        duration: 1000
    },
    settings: {
        backoffStrategy: (attemptsMade: number) => {
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            return Math.min(2000 * Math.pow(2, attemptsMade), 32000);
        }
    }
});

const proWorker = new Worker(QUEUE_PRO, processJob, {
    connection: redis,
    concurrency: Number(env.WORKER_CONCURRENCY_PRO) || 20,
    lockDuration: 300000, // 5 minute initial lock
    limiter: {
        max: 10,
        duration: 1000
    },
    settings: {
        backoffStrategy: (attemptsMade: number) => {
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            return Math.min(2000 * Math.pow(2, attemptsMade), 32000);
        }
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
        
        sub.on('message', async (channel: string, message: string) => {
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

logger.info({ 
    freeConcurrency: freeWorker.opts.concurrency, 
    proConcurrency: proWorker.opts.concurrency 
}, '✅ WORKER BOOT: BullMQ Workers created');


// Kick off crash recovery
resumeOrphanedExecutions();

// Start background preview cleanup
RuntimeCleanup.start();

// ── Fast Path Guard ──────────────────────────────────────────────
setInterval(async () => {
    try {
        const freeWaiting = await (await freeWorker.client).llen(`bull:${QUEUE_FREE}:wait`);
        const proWaiting = await (await proWorker.client).llen(`bull:${QUEUE_PRO}:wait`);
        if (freeWaiting + proWaiting > 3000) {
            logger.error('💥 [Worker] Fast Path Guard: Queue overflow! Pausing all queues immediately.');
            await freeWorker.pause(true);
            await proWorker.pause(true);
        }
    } catch { /* ignore */ }
}, 1000);

// Redis connection error handling & auto-recovery
redis.on('error', (err: Error) => {
    logger.error({ err: err.message }, '[Worker] Redis connection error');
    if ('code' in err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        RedisRecovery.handleRedisCrash().catch((recErr: any) => {
            logger.error({ err: recErr.message }, '[Worker] Critical recovery failure');
        });
    }
});

// ── Control Plane: Mode-Based Queue Enforcement ──────────────────────────────
// The Control Plane reads aggregated metrics from Redis, evaluates system mode,
// and distributes the mode to all nodes. This loop enforces the mode locally
// by pausing/resuming BullMQ queues.

const controlPlane = new ControlPlane(redis);
controlPlane.start();

let lastEnforcedMode: string = 'NORMAL';
const REGION_ID = process.env.REGION_ID || 'local';

setInterval(async () => {
    try {
        const mode = await ControlPlane.getRegionModeSafe(redis, REGION_ID);
        
        if (mode !== lastEnforcedMode) {
            logger.warn({ previousMode: lastEnforcedMode, newMode: mode }, '🚦 [Worker] Enforcing Control Plane mode transition');
            
            switch (mode) {
                case 'EMERGENCY':
                    // Pause both queues globally — stop accepting new work
                    await freeWorker.pause(true);
                    await proWorker.pause(true);
                    logger.error('🔴 [Worker] EMERGENCY: All queues PAUSED');
                    break;
                    
                case 'PROTECT':
                    // Pause free tier (low priority), keep pro running
                    await freeWorker.pause(true);
                    await proWorker.resume();
                    logger.warn('🟠 [Worker] PROTECT: Free queue paused, Pro queue active');
                    break;
                    
                case 'DEGRADED':
                    // Both queues active but free tier was already rate-limited
                    await freeWorker.resume();
                    await proWorker.resume();
                    logger.info('🟡 [Worker] DEGRADED: All queues active (gateway shedding low-priority)');
                    break;
                    
                case 'NORMAL':
                    // Resume everything
                    await freeWorker.resume();
                    await proWorker.resume();
                    logger.info('🟢 [Worker] NORMAL: All queues active');
                    break;
            }
            
            lastEnforcedMode = mode;
        }
    } catch (err) {
        logger.warn({ err: (err as Error).message }, '[Worker] Control Plane enforcement check failed');
    }
}, 5000);

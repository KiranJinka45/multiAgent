"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log('🚀 WORKER BOOT: Loading entries...');
require("dotenv/config");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const utils_3 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const core_engine_1 = require("@packages/core-engine");
const utils_4 = require("@packages/utils");
const os_1 = __importDefault(require("os"));
console.log('✅ WORKER BOOT: All imports resolved successfully');
console.log('STEP 1: Starting Worker boot sequence...');
const WORKER_ID = `worker-${os_1.default.hostname()}-${process.pid}`;
const orchestrator = new core_engine_1.Orchestrator();
const workerId = `worker-${Math.random().toString(36).substring(2, 9)}`;
// Redis Connectivity Trace
console.log('STEP 2: Initializing Redis connection (Shared)...');
utils_2.redis.on('connect', () => console.log('🔗 Redis: Connecting...'));
utils_2.redis.on('ready', () => console.log('✅ Redis: Connection established and ready.'));
utils_2.redis.on('error', (err) => console.error('❌ Redis: Connection error:', err.message));
// 💓 Heartbeat handles both Cluster Registration and Orchestration Health
const HEARTBEAT_INTERVAL = 5000;
setInterval(async () => {
    try {
        const payload = {
            workerId: WORKER_ID,
            hostname: os_1.default.hostname(),
            load: 0, // TODO: Map to actual CPU/Job load
            status: 'IDLE',
            memory: process.memoryUsage().heapUsed / 1024 / 1024,
            uptime: process.uptime()
        };
        // 1. Update Cluster Manager (For steering & pruning)
        await utils_4.WorkerClusterManager.heartbeat(payload);
        // 2. Update Legacy Health Key (For system-startup.cjs compatibility)
        await utils_2.redis.set('system:health:worker', JSON.stringify({ ...payload, status: 'online' }), 'EX', 15);
    }
    catch (err) {
        observability_1.logger.warn({ err: err.message }, '[Worker] Heartbeat sync failed');
    }
}, HEARTBEAT_INTERVAL);
console.log('STEP 4: Background task initialization started.');
const RECOVERY_STALE_MS = 60000;
const resumeOrphanedExecutions = async () => {
    observability_1.logger.info('Scanning for orphaned missions to resume...');
    try {
        const activeMissions = await utils_4.missionController.listActiveMissions();
        const activeHeartbeatKeys = await utils_2.redis.keys('worker:heartbeat:*');
        const activeWorkerIds = new Set(activeHeartbeatKeys.map(k => k.split(':').pop()));
        for (const mission of activeMissions) {
            const missionWorkerId = mission.metadata?.workerId;
            const isStale = Date.now() - mission.updatedAt > RECOVERY_STALE_MS;
            const isOwnerDead = missionWorkerId && !activeWorkerIds.has(missionWorkerId);
            if (isStale || isOwnerDead) {
                observability_1.logger.info({
                    missionId: mission.id,
                    status: mission.status,
                    isStale,
                    isOwnerDead
                }, 'Resuming orphaned mission...');
                utils_4.stuckBuildsTotal.inc();
                executeBuild({
                    prompt: mission.prompt,
                    userId: mission.userId,
                    projectId: mission.projectId,
                    executionId: mission.id,
                    isFastPreview: !!mission.metadata?.fastPath
                }).catch(err => observability_1.logger.error({ err, missionId: mission.id }, 'Failed to resume orphaned mission'));
            }
        }
    }
    catch (err) {
        observability_1.logger.error({ err }, 'Error during orphaned mission scan');
    }
};
// Set periodic recovery
setInterval(resumeOrphanedExecutions, 60_000);
const executeBuild = async (data, job) => {
    const { prompt, userId, projectId, executionId, isFastPreview } = data;
    const tier = job ? (job.queueName.includes('pro') ? 'pro' : 'free') : 'instant';
    // 🔒 Single Job Processing Guard (Shared between Queue & Instant Trigger)
    const lockKey = `build:lock:${executionId}`;
    const lock = await utils_2.redis.set(lockKey, executionId, 'EX', 600, 'NX');
    if (!lock) {
        if (job)
            observability_1.logger.warn({ executionId, jobId: job.id, tier }, 'Duplicate execution (Queue) detected. Skipping.');
        return;
    }
    const controller = new AbortController();
    // Record queue wait time if it's a job
    if (job) {
        const waitTime = (Date.now() - job.timestamp) / 1000;
        utils_4.queueWaitTimeSeconds.observe({ queue_name: tier }, waitTime);
    }
    // --- Auto-Lock-Extension Mechanism ---
    const lockExtensionInterval = setInterval(async () => {
        try {
            // Extend BullMQ lock if job exists
            if (job && await job.isActive()) {
                // Increased extension to 5 minutes for safety during heavy builds
                await job.extendLock(job.token, 300000);
            }
            // Verify execution ownership in Redis
            const owner = await utils_2.redis.get(lockKey);
            if (owner !== executionId) {
                throw new Error('Execution lock ownership lost (Heartbeat Violation)');
            }
            // Extend Redis lock
            await utils_2.redis.expire(lockKey, 600);
            observability_1.logger.debug({ executionId, tier }, 'Execution locks extended (Heartbeat)');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            observability_1.logger.error({ executionId, error: errorMessage, tier }, 'CRITICAL: Lock heartbeat failed. Aborting.');
            controller.abort();
        }
    }, 30000);
    const startTime = Date.now();
    try {
        await utils_4.missionController.updateMission(executionId, {
            status: 'planning',
            metadata: { workerId }
        });
        // --- BUILD TIMEOUT GUARD (Fix 9) ---
        const BUILD_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
        const timeout = setTimeout(() => {
            observability_1.logger.error({ executionId }, '[Worker] Build timeout reached. Aborting.');
            controller.abort();
        }, BUILD_TIMEOUT_MS);
        // ------------------------------------
        return await (0, utils_4.runWithTracing)(executionId, async () => {
            observability_1.logger.info({ executionId, userId, projectId, tier }, 'Worker entering executeBuild loop');
            const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
            await fs_extra_1.default.ensureDir(sandboxDir);
            // --- CACHE RESTORATION PHASE ---
            const cacheRestored = await utils_4.BuildCacheManager.restore(projectId, sandboxDir);
            if (cacheRestored) {
                observability_1.logger.info({ projectId }, '[Worker] Incremental build: Cache restored successfully');
                await utils_4.eventBus.stage(executionId, utils_4.JobStage.PLAN.toLowerCase(), 'completed', 'Incremental build: Restored previous build cache', 20, projectId);
                // --- GRAPH ANALYSIS PHASE ---
                const affectedNodes = await utils_4.BuildGraphEngine.getAffectedNodes(sandboxDir);
                if (affectedNodes.length === 0) {
                    observability_1.logger.info({ projectId }, '[Worker] Zero affected nodes. Skipping full build.');
                    await utils_4.eventBus.stage(executionId, utils_4.JobStage.PLAN.toLowerCase(), 'completed', 'No changes detected. Reusing existing artifacts.', 30, projectId);
                    // We could return early here if the system supports artifact injection only
                }
                else {
                    observability_1.logger.info({ projectId, count: affectedNodes.length }, '[Worker] Partial changes detected');
                }
            }
            try {
                const result = await orchestrator.execute(prompt, userId, projectId, executionId, controller.signal, { isFastPreview });
                clearTimeout(timeout); // Success - clear timeout
                if (result && !result.success) {
                    const errorResult = result;
                    throw new Error(errorResult.error || 'Build failed');
                }
                // 🛡️ FINAL INTEGRITY WATCHDOG
                const validationResult = await utils_4.ArtifactValidator.validate(projectId);
                if (!validationResult.valid) {
                    const error = `Build integrity failure: Missing ${validationResult.missingFiles?.join(', ') || 'critical files'}`;
                    observability_1.logger.error({ projectId, missing: validationResult.missingFiles }, '[Worker] Integrity Check FAILED');
                    throw new Error(error);
                }
                observability_1.logger.info({ projectId }, '[Worker] Integrity Check PASSED');
                // --- CACHE SAVE PHASE ---
                await utils_4.BuildCacheManager.save(projectId, sandboxDir);
                await utils_4.missionController.updateMission(executionId, { status: 'completed' });
                const durationMs = Date.now() - startTime;
                await utils_4.ReliabilityMonitor.recordSuccess(durationMs);
                return result;
            }
            catch (err) {
                clearTimeout(timeout);
                throw err;
            }
        });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        observability_1.logger.error({ executionId, error: msg, tier }, 'Execution failed');
        // --- SELF-EVOLUTION HIJACK ---
        try {
            const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
            if (fs_extra_1.default.existsSync(sandboxDir)) {
                // Collect context for evolution
                const entries = await fs_extra_1.default.readdir(sandboxDir);
                const files = [];
                for (const e of entries.slice(0, 5)) { // Limit to top 5 files for context
                    const fPath = path_1.default.join(sandboxDir, e);
                    if ((await fs_extra_1.default.stat(fPath)).isFile() && (e.endsWith('.ts') || e === 'package.json')) {
                        files.push({ path: e, content: await fs_extra_1.default.readFile(fPath, 'utf8') });
                    }
                }
                const evolved = await utils_4.EvolutionManager.evolve(executionId, msg, files);
                if (evolved) {
                    observability_1.logger.info({ executionId }, '[Worker] Self-evolution initiated. Skipping failure state.');
                    return; // Mission will be re-queued by EvolutionManager
                }
            }
        }
        catch (evoErr) {
            observability_1.logger.error({ executionId, err: evoErr.message }, '[Worker] Self-evolution trigger failed');
        }
        await utils_4.missionController.updateMission(executionId, {
            status: 'failed',
            metadata: { error: msg }
        });
        await utils_4.eventBus.stage(executionId, utils_4.JobStage.FAILED.toLowerCase(), 'failed', `Build failed: ${msg}`, 100, projectId);
        await utils_4.eventBus.error(executionId, `[BuildWorker] ${msg}`, projectId);
        await utils_4.ReliabilityMonitor.recordFailure();
        throw error;
    }
    finally {
        clearInterval(lockExtensionInterval);
    }
};
const processJob = async (job) => {
    return await executeBuild(job.data, job);
};
// 1. Initialize Tiers
if (!utils_3.QUEUE_FREE)
    throw new Error("FATAL: QUEUE_FREE name must be provided");
if (!utils_3.QUEUE_PRO)
    throw new Error("FATAL: QUEUE_PRO name must be provided");
const freeWorker = new utils_1.Worker(utils_3.QUEUE_FREE, processJob, {
    connection: utils_2.redis,
    concurrency: utils_4.env.WORKER_CONCURRENCY_FREE || 5,
    lockDuration: 300000, // 5 minute initial lock
    limiter: {
        max: 5, // Process max 5 jobs per second per worker instance
        duration: 1000
    }
});
const proWorker = new utils_1.Worker(utils_3.QUEUE_PRO, processJob, {
    connection: utils_2.redis,
    concurrency: utils_4.env.WORKER_CONCURRENCY_PRO || 20,
    lockDuration: 300000, // 5 minute initial lock
    limiter: {
        max: 10,
        duration: 1000
    }
});
const setupWorkerEvents = (worker, name) => {
    worker.on('completed', (job) => {
        observability_1.logger.info({ jobId: job.id, worker: name }, 'Job completed');
    });
    worker.on('failed', (job, err) => {
        observability_1.logger.error({ jobId: job?.id, worker: name, err: err.message }, 'Job failed');
    });
};
setupWorkerEvents(freeWorker, 'free');
setupWorkerEvents(proWorker, 'pro');
// Graceful shutdown
const shutdown = async () => {
    observability_1.logger.info('Shutting down workers...');
    try {
        await utils_4.WorkerClusterManager.deregister(WORKER_ID);
        utils_4.FailoverManager.stop();
        await utils_4.RuntimeCleanup.shutdownAll();
        await utils_4.NodeRegistry.deregister();
        await Promise.all([freeWorker.close(), proWorker.close()]);
        await utils_2.redis.quit();
    }
    catch (err) {
        observability_1.logger.error({ err }, 'Shutdown cleanup partial failure');
    }
    process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// --- Consolidated Heartbeat above at line 49 ---
// Cluster & Instant Trigger Listeners
(async () => {
    try {
        const sub = utils_2.redis.duplicate();
        // ioredis handles connection automatically
        observability_1.logger.info({ workerId: WORKER_ID }, '[Worker] Subscribing to direct steering channel');
        await sub.subscribe(`worker:trigger:${WORKER_ID}`);
        sub.on('message', async (channel, message) => {
            if (channel !== `worker:trigger:${WORKER_ID}`)
                return;
            try {
                const { projectId } = JSON.parse(message);
                observability_1.logger.info({ projectId }, '[Worker] Direct job steering received! Triggering execution.');
            }
            catch (pErr) {
                observability_1.logger.error({ err: pErr }, '[Worker] Failed to parse steering message');
            }
        });
    }
    catch (err) {
        const error = err;
        observability_1.logger.error({ err: error.message }, '[Worker] Direct steering listener failed');
    }
})();
(async () => {
    try {
        const nodeId = await utils_4.NodeRegistry.register();
        observability_1.logger.info({ nodeId }, 'Node registered in cluster');
        utils_4.FailoverManager.start();
        const sub = utils_2.redis.duplicate();
        await sub.subscribe('cluster:schedule:assign', 'cluster:node:restart', 'build:init:trigger');
        sub.on('message', async (channel, message) => {
            try {
                const data = JSON.parse(message);
                if (channel === 'build:init:trigger') {
                    observability_1.logger.info({ executionId: data.executionId }, '⚡ Instant Trigger received. Initiating build...');
                    // Fire and forget so we don't block the sub loop
                    executeBuild(data).catch(err => observability_1.logger.error({ err, executionId: data.executionId }, 'Instant Trigger execution failed'));
                }
                else if (channel === 'cluster:schedule:assign') {
                    if (data.targetNodeId === nodeId) {
                        observability_1.logger.info({ projectId: data.request.projectId }, '[Worker] Picking up assigned runtime');
                        utils_4.PreviewOrchestrator.start(data.request.projectId, data.request.executionId, data.request.userId).catch((err) => {
                            const error = err instanceof Error ? err.message : String(err);
                            observability_1.logger.error({ err: error, projectId: data.request.projectId }, 'Failed to start assigned runtime');
                        });
                    }
                }
                else if (channel === 'cluster:node:restart') {
                    if (data.nodeId === nodeId) {
                        observability_1.logger.warn({ reason: data.reason }, '[Worker] Received restart signal. Shutting down gracefully...');
                        await shutdown();
                    }
                }
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                observability_1.logger.error({ error: errMsg }, `[Worker] Error processing message on channel ${channel}`);
            }
        });
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        observability_1.logger.error({ error: errMsg }, 'Failed to register node in cluster (non-fatal, running in standalone mode)');
    }
})();
console.log('STEP 5: Workers created. Listening for jobs.');
observability_1.logger.info(`Workers started: Free (concurrency=${freeWorker.opts.concurrency}), Pro (concurrency=${proWorker.opts.concurrency})`);
console.log(`✅ WORKER BOOT: BullMQ Workers created — Free (${freeWorker.opts.concurrency}), Pro (${proWorker.opts.concurrency})`);
// Kick off crash recovery
resumeOrphanedExecutions();
// Start background preview cleanup
utils_4.RuntimeCleanup.start();
// Redis connection error handling & auto-recovery
utils_2.redis.on('error', (err) => {
    observability_1.logger.error({ err: err.message }, '[Worker] Redis connection error');
    if ('code' in err && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        utils_4.RedisRecovery.handleRedisCrash().catch(recErr => {
            observability_1.logger.error({ err: recErr.message }, '[Worker] Critical recovery failure');
        });
    }
});
//# sourceMappingURL=build-worker.js.map
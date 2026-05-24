import '@packages/observability';
import 'dotenv/config';
import { SecretProvider } from '@packages/config';
import { logger, initTelemetry, registry } from '@packages/observability';
import { onShutdown, createHealthRouter, redis, ChaosEngine, eventBus } from '@packages/utils';
import express from 'express';
import { internalAuth } from '@packages/auth-internal';

// Initialize telemetry as early as possible
initTelemetry('worker-fleet');

const opsApp = express();
opsApp.disable('x-powered-by');

// Operational metrics endpoint (Protected)
opsApp.get('/metrics', internalAuth(['monitoring']), async (req, res) => {
    try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    } catch {
        res.status(500).end();
    }
});

// Standardized Health Check (Standardized)
opsApp.use(createHealthRouter({ 
    serviceName: 'worker-fleet',
    checkDependencies: async () => ({
        redis: { status: redis.status === 'ready' ? 'up' : 'down' }
    })
}));

const port = Number(process.env.WORKER_PORT || 8082);
const opsServer = opsApp.listen(port, '0.0.0.0', () => {
    logger.info(`🚦 [Worker] Hardened Ops Server running on port ${port}`);
});

async function waitForRedis(maxRetries = 15): Promise<void> {
    console.log('[DEBUG-WORKER] Redis Status:', (redis as any).status, 'Options:', (redis as any).options?.host, (redis as any).options?.port);
    for (let i = 0; i < maxRetries; i++) {
        if ((redis as any).status === 'ready' || (redis as any).status === 'connect') {
            logger.info({ status: (redis as any).status }, '[Worker] ✅ Redis connection established (Bypass Ready)');
            return;
        }
        logger.warn({ attempt: i + 1, maxRetries, status: redis.status }, '⏳ Waiting for Redis...');
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('FATAL: Redis failed to connect after 15 seconds');
}

/**
 * Safely imports a worker module and logs its registration.
 * This prevents a single failing worker from crashing the entire fleet bootstrap.
 */
async function safeImportWorker(name: string, path: string) {
    try {
        console.log(`[DEBUG] Importing worker ${name} from path: ${path}`);
        await import(path);

        logger.info(`✅ [Worker] ${name} registered`);
    } catch (err) {
        console.error(`[DEBUG] FAILED to import worker ${name} from ${path}:`, err);
        logger.error({ err, path }, `❌ [Worker] Failed to register ${name}`);
    }

}



// ── Bootstrap ────────────────────────────────────────────────────────────────
import { db } from '@packages/db';

async function bootstrap() {
    logger.info('[Worker] 🚀 Starting fail-safe bootstrap sequence...');
    
    // 0. Initialize Secrets (CRITICAL: Load from Vault/K8s before starting fleet)
    if (typeof SecretProvider.bootstrap === 'function') {
        await SecretProvider.bootstrap();
    } else if ((SecretProvider as any).SecretProvider && typeof (SecretProvider as any).SecretProvider.bootstrap === 'function') {
        await (SecretProvider as any).SecretProvider.bootstrap();
    } else {
        console.warn('⚠️ [Worker] SecretProvider.bootstrap is not a function. Skipping...');
    }

    // Register Graceful Shutdown Tasks early
    onShutdown('Ops Server', () => new Promise(resolve => opsServer.close(() => resolve())));
    onShutdown('Event Bus', () => eventBus.shutdown());
    onShutdown('Database', () => db.$disconnect());

    // 1. Wait for Redis to be ready (Production Health Gate)
    await waitForRedis();

    // 2. Register core worker fleet (Harden with try/catch)
    logger.info('[Worker] 🏗️  Registering core worker fleet...');

    await safeImportWorker('Architecture', './architecture-worker');
    await safeImportWorker('Planner', './planner-worker');
    await safeImportWorker('Generator', './generator-worker');
    await safeImportWorker('Validator', './validator-worker');
    await safeImportWorker('Deploy', './deploy-worker');

    // 3. Register secondary workers
    await safeImportWorker('Backend', './backend-worker');
    await safeImportWorker('Build', './build-worker');
    await safeImportWorker('Docker', './docker-worker');
    await safeImportWorker('Frontend', './frontend-worker');
    await safeImportWorker('Meta-Agent', './meta-agent-worker');
    await safeImportWorker('Repair', './repair-worker');
    await safeImportWorker('Supervisor', './supervisor-worker');
    await safeImportWorker('Evolution', './evolution-worker');
    await safeImportWorker('Auto-Refactor', './auto-refactor-worker');

    // 4. Register specialized & background workers
    await safeImportWorker('Analytics', './analytics-worker');
    await safeImportWorker('Billing', './billing-worker');
    await safeImportWorker('Pattern', './pattern-worker');
    await safeImportWorker('Rollback', './rollback-worker');
    await safeImportWorker('Self-Modification', './self-modification-worker');
    await safeImportWorker('Strategy', './strategy-worker');
    await safeImportWorker('Git', './git-worker');
    await safeImportWorker('Evaluation', './evaluation-worker');
    
    // 6. Institutional Reliability Aggregation (Priority 1)
    try {
        const { startReliabilityWorker } = await import('./reliability-aggregator-worker.js');
        startReliabilityWorker(60000); // 1 minute for rapid evidence accumulation in dev
        logger.info('✅ [Worker] Reliability Aggregator registered');
    } catch (err) {
        logger.error({ err }, '❌ [Worker] Failed to register Reliability Aggregator');
    }

    // 5. Register Mission Recorder (Redis Streams Consumer Group)
    try {
        const { setupMissionRecorder } = await import('./mission-recorder.js');
        await setupMissionRecorder();
        logger.info('✅ [Worker] Mission Recorder registered');
    } catch (err) {
        logger.error({ err }, '❌ [Worker] Failed to register Mission Recorder');
    }

    // 5. Register specialized workers from packages
    try {
        const autonomousAgent = await import('@packages/autonomous-ops');
        await (autonomousAgent as any).setupAutonomousWorker();
        logger.info('✅ [Worker] Autonomous service registered');
    } catch (err) {
        logger.error({ err }, '❌ [Worker] Failed to register Autonomous service');
    }

    logger.info('[Worker] 🏁 Bootstrap complete — monitoring fleet status');

    // Heartbeat for production visibility and Control Plane tracking
    setInterval(async () => {
        // 🛡️ Phase 25: Chaos Injection (Simulate random worker crash)
        if (process.env.ENABLE_CHAOS === 'true') {
            ChaosEngine.injectWorkerCrash();
        }

        const workerId = process.env.HOSTNAME || `worker-${process.pid}`;
        await redis.set(`worker:heartbeat:${workerId}`, 'active', 'EX', 30);
        
        logger.info({
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage().rss
        }, '💓 Worker Heartbeat');
    }, 10000);
}


bootstrap().catch(err => {
    console.error('❌ WORKER BOOT FATAL ERROR:', err);
    logger.error({ err }, '[Worker] FATAL: Bootstrap sequence failed');
    process.exit(1);
});

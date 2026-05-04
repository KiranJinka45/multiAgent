import '@packages/observability/otel';
import 'dotenv/config';
import { env } from '@packages/config';
import { logger, initTelemetry, registry } from '@packages/observability';
import { onShutdown, createHealthRouter, redis } from '@packages/utils';
import express from 'express';
import { internalAuth } from '@packages/auth-internal';

// Initialize telemetry as early as possible
initTelemetry({
    serviceName: 'worker-fleet',
    enableTracing: true,
});

const opsApp = express();

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

const opsServer = opsApp.listen(8080, '0.0.0.0', () => {
    logger.info('🚦 [Worker] Hardened Ops Server running on port 8080');
});

// ── FIX 3: Redis Readiness Gate ──────────────────────────────────────────────
async function waitForRedis(maxRetries = 15): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
        if (redis.status === 'ready') {
            logger.info('[Worker] ✅ Redis connection established');
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
        await import(path);
        logger.info(`✅ [Worker] ${name} registered`);
    } catch (err) {
        logger.error({ err, path }, `❌ [Worker] Failed to register ${name}`);
    }
}



// ── Bootstrap ────────────────────────────────────────────────────────────────
import { eventBus } from '@packages/events';
import { db } from '@packages/db';

async function bootstrap() {
    logger.info('[Worker] 🚀 Starting fail-safe bootstrap sequence...');

    // Register Graceful Shutdown Tasks early
    onShutdown('Ops Server', () => new Promise(resolve => opsServer.close(() => resolve())));
    onShutdown('Event Bus', () => eventBus.shutdown());
    onShutdown('Database', () => db.$disconnect());

    // 1. Wait for Redis to be ready (Production Health Gate)
    await waitForRedis();


    if (redis.status !== 'ready') {
        logger.error('[Worker] FATAL: Redis not ready. Failing fast.');
        process.exit(1);
    }

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
    await safeImportWorker('Mission', './mission-worker');
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

    // 5. Register specialized workers from packages
    try {
        const autonomousAgent = await import('@packages/autonomous-agent');
        await (autonomousAgent as any).setupAutonomousWorker();
        logger.info('✅ [Worker] Autonomous service registered');
    } catch (err) {
        logger.error({ err }, '❌ [Worker] Failed to register Autonomous service');
    }

    logger.info('[Worker] 🏁 Bootstrap complete — monitoring fleet status');

    // Heartbeat for production visibility
    setInterval(() => {
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

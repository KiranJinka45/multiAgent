"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@packages/observability/otel");
require("dotenv/config");
const observability_1 = require("@packages/observability");
const utils_1 = require("@packages/utils");
const express_1 = __importDefault(require("express"));
const auth_internal_1 = require("@packages/auth-internal");
// Initialize telemetry as early as possible
(0, observability_1.initTelemetry)({
    serviceName: 'worker-fleet',
    enableTracing: true,
});
const opsApp = (0, express_1.default)();
// Operational metrics endpoint (Protected)
opsApp.get('/metrics', (0, auth_internal_1.internalAuth)(['monitoring']), async (req, res) => {
    try {
        res.set('Content-Type', observability_1.registry.contentType);
        res.end(await observability_1.registry.metrics());
    }
    catch {
        res.status(500).end();
    }
});
// Standardized Health Check (Standardized)
opsApp.use((0, utils_1.createHealthRouter)({
    serviceName: 'worker-fleet',
    checkDependencies: async () => ({
        redis: { status: utils_1.redis.status === 'ready' ? 'up' : 'down' }
    })
}));
const opsServer = opsApp.listen(8080, '0.0.0.0', () => {
    observability_1.logger.info('🚦 [Worker] Hardened Ops Server running on port 8080');
});
// ── FIX 3: Redis Readiness Gate ──────────────────────────────────────────────
async function waitForRedis(maxRetries = 15) {
    for (let i = 0; i < maxRetries; i++) {
        if (utils_1.redis.status === 'ready') {
            observability_1.logger.info('[Worker] ✅ Redis connection established');
            return;
        }
        observability_1.logger.warn({ attempt: i + 1, maxRetries, status: utils_1.redis.status }, '⏳ Waiting for Redis...');
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('FATAL: Redis failed to connect after 15 seconds');
}
/**
 * Safely imports a worker module and logs its registration.
 * This prevents a single failing worker from crashing the entire fleet bootstrap.
 */
async function safeImportWorker(name, path) {
    try {
        await Promise.resolve(`${path}`).then(s => __importStar(require(s)));
        observability_1.logger.info(`✅ [Worker] ${name} registered`);
    }
    catch (err) {
        observability_1.logger.error({ err, path }, `❌ [Worker] Failed to register ${name}`);
    }
}
// ── Bootstrap ────────────────────────────────────────────────────────────────
const events_1 = require("@packages/events");
const db_1 = require("@packages/db");
async function bootstrap() {
    observability_1.logger.info('[Worker] 🚀 Starting fail-safe bootstrap sequence...');
    // Register Graceful Shutdown Tasks early
    (0, utils_1.onShutdown)('Ops Server', () => new Promise(resolve => opsServer.close(() => resolve())));
    (0, utils_1.onShutdown)('Event Bus', () => events_1.eventBus.shutdown());
    (0, utils_1.onShutdown)('Database', () => db_1.db.$disconnect());
    // 1. Wait for Redis to be ready (Production Health Gate)
    await waitForRedis();
    if (utils_1.redis.status !== 'ready') {
        observability_1.logger.error('[Worker] FATAL: Redis not ready. Failing fast.');
        process.exit(1);
    }
    // 2. Register core worker fleet (Harden with try/catch)
    observability_1.logger.info('[Worker] 🏗️  Registering core worker fleet...');
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
        const autonomousAgent = await Promise.resolve().then(() => __importStar(require('@packages/autonomous-agent')));
        await autonomousAgent.setupAutonomousWorker();
        observability_1.logger.info('✅ [Worker] Autonomous service registered');
    }
    catch (err) {
        observability_1.logger.error({ err }, '❌ [Worker] Failed to register Autonomous service');
    }
    observability_1.logger.info('[Worker] 🏁 Bootstrap complete — monitoring fleet status');
    // Heartbeat for production visibility
    setInterval(() => {
        observability_1.logger.info({
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage().rss
        }, '💓 Worker Heartbeat');
    }, 10000);
}
bootstrap().catch(err => {
    console.error('❌ WORKER BOOT FATAL ERROR:', err);
    observability_1.logger.error({ err }, '[Worker] FATAL: Bootstrap sequence failed');
    process.exit(1);
});
//# sourceMappingURL=index.js.map
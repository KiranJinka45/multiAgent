"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
require("dotenv/config");
const runtime_1 = require("@packages/runtime");
const observability_1 = require("@packages/observability");
async function main() {
    observability_1.logger.info('[WatchdogWorker] Starting background resource monitor...');
    // ── Sovereign Safety Capstone: Runaway Protection ──────────────────────
    // This allows the platform to protect its 99.9% SLO from infinite or 
    // runaway agent loops by terminating violators.
    runtime_1.PreviewWatchdog.on('resourceViolation', ({ type, usage, threshold }) => {
        observability_1.logger.error({ type, usage, threshold }, '🚨 [WatchdogWorker] RESOURCE VIOLATION DETECTED');
        observability_1.logger.warn('[WatchdogWorker] Triggering emergency shutdown for runaway agent...');
        process.kill(process.pid, 'SIGTERM');
    });
    // Start the watchdog check loop with enterprise thresholds
    runtime_1.PreviewWatchdog.start({
        memoryThreshold: process.env.WATCHDOG_MEM_LIMIT || '450Mi',
        cpuThreshold: parseInt(process.env.WATCHDOG_CPU_LIMIT || '80')
    });
    // Handle termination
    process.on('SIGTERM', () => {
        observability_1.logger.info('[WatchdogWorker] Shutting down...');
        runtime_1.PreviewWatchdog.stop();
        process.exit(0);
    });
    process.on('SIGINT', () => {
        observability_1.logger.info('[WatchdogWorker] Shutting down...');
        runtime_1.PreviewWatchdog.stop();
        process.exit(0);
    });
    // Keep process alive
    setInterval(() => { }, 1000);
}
main().catch(err => {
    observability_1.logger.error({ err }, '[WatchdogWorker] Critical startup failure');
    process.exit(1);
});
//# sourceMappingURL=watchdog-worker.js.map
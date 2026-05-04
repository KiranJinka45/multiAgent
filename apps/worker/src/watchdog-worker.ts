// @ts-nocheck
import 'dotenv/config';
import { PreviewWatchdog } from '@packages/runtime';
import { logger } from '@packages/observability';

async function main() {
    logger.info('[WatchdogWorker] Starting background resource monitor...');
    
    // ── Sovereign Safety Capstone: Runaway Protection ──────────────────────
    // This allows the platform to protect its 99.9% SLO from infinite or 
    // runaway agent loops by terminating violators.
    PreviewWatchdog.on('resourceViolation', ({ type, usage, threshold }) => {
        logger.error({ type, usage, threshold }, '🚨 [WatchdogWorker] RESOURCE VIOLATION DETECTED');
        
        logger.warn('[WatchdogWorker] Triggering emergency shutdown for runaway agent...');
        process.kill(process.pid, 'SIGTERM');
    });

    // Start the watchdog check loop with enterprise thresholds
    PreviewWatchdog.start({
        memoryThreshold: process.env.WATCHDOG_MEM_LIMIT || '450Mi',
        cpuThreshold: parseInt(process.env.WATCHDOG_CPU_LIMIT || '80')
    });

    // Handle termination
    process.on('SIGTERM', () => {
        logger.info('[WatchdogWorker] Shutting down...');
        PreviewWatchdog.stop();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        logger.info('[WatchdogWorker] Shutting down...');
        PreviewWatchdog.stop();
        process.exit(0);
    });

    // Keep process alive
    setInterval(() => {}, 1000);
}

main().catch(err => {
    logger.error({ err }, '[WatchdogWorker] Critical startup failure');
    process.exit(1);
});

import 'dotenv/config';
import { freeQueue, proQueue } from '@queue/build-queue';
import logger from '@config/logger';
import redis from '@queue/redis-client';

const WATCHDOG_INTERVAL = 10000;

logger.info("Initializing BullMQ Queue Watchdog (Interval: 10s)...");

setInterval(async () => {
    try {
        const freeStalled = await (freeQueue as any).getStalledJobs?.() || [];
        const proStalled = await (proQueue as any).getStalledJobs?.() || [];

        if (freeStalled.length > 0) {
            logger.warn({ count: freeStalled.length, stalledIds: freeStalled }, "Restarting stalled FREE builds from watchdog");
        }

        if (proStalled.length > 0) {
            logger.warn({ count: proStalled.length, stalledIds: proStalled }, "Restarting stalled PRO builds from watchdog");
        }

        // --- NEW: Waiting Job & Heartbeat Check ---
        const freeJobs = await freeQueue.getJobCounts();
        if (freeJobs.waiting > 0) {
            const heartbeat = await redis.get('system:health:worker');
            if (!heartbeat) {
                logger.error({ waitingJobs: freeJobs.waiting }, "CRITICAL: Jobs waiting but Worker is OFFLINE. Triggering group restart...");
                // Exit with error to trigger parent system-startup.js restart
                process.exit(1);
            } else {
                const health = JSON.parse(heartbeat);
                const age = Date.now() - health.lastSeen;
                if (age > 30000) { // 30s threshold
                    logger.error({ age, waitingJobs: freeJobs.waiting }, "CRITICAL: Worker heartbeat is STALE. Worker may be frozen. Triggering group restart...");
                    process.exit(1);
                }
            }
        }
    } catch (err: any) {
        logger.error({ err: err.message }, "Watchdog failed to check stalled jobs");
    }
}, WATCHDOG_INTERVAL);

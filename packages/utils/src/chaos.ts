import { logger } from '@packages/observability';
import { redis } from './server';

/**
 * ZTAN Chaos Engine
 * Used for reliability testing by injecting faults into the distributed system.
 */
export const ChaosEngine = {
    /**
     * Simulates a Redis connection outage.
     */
    async simulateRedisOutage(durationMs: number = 5000) {
        logger.warn({ durationMs }, '[ChaosEngine] Injecting Redis Outage...');
        // We can't easily "kill" the redis server from within node without sudo/exec,
        // but we can force the client to disconnect or block.
        if ((redis as any).disconnect) {
            (redis as any).disconnect();
            setTimeout(() => {
                logger.info('[ChaosEngine] Restoring Redis Connection...');
                (redis as any).connect().catch((e: any) => logger.error({ err: e.message }, 'Failed to restore Redis'));
            }, durationMs);
        }
    },

    /**
     * Simulates a worker crash (current process exit).
     */
    injectWorkerCrash(probability: number = 0.1) {
        if (Math.random() < probability) {
            logger.error('[ChaosEngine] CRITICAL: Injected Worker Crash! Exiting process...');
            process.exit(1);
        }
    },

    /**
     * Simulates container execution hang.
     */
    async injectContainerHang(probability: number = 0.05, durationMs: number = 30000) {
        if (Math.random() < probability) {
            logger.warn({ durationMs }, '[ChaosEngine] Injecting Container Hang...');
            await new Promise(r => setTimeout(r, durationMs));
        }
    }
};

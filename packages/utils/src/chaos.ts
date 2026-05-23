import { logger } from '@packages/observability';
import { redis, injectRedisOutage } from './server.js';

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
        injectRedisOutage(durationMs);
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
    },

    /**
     * Runs a full chaos cycle.
     */
    async runChaosCycle() {
        logger.info('[ChaosEngine] Starting Automated Chaos Cycle');
        await this.simulateRedisOutage(2000);
        this.injectWorkerCrash(0.01);
        await this.injectContainerHang(0.01, 5000);
        return { success: true, timestamp: Date.now() };
    }
};

export const runChaosCycle = ChaosEngine.runChaosCycle.bind(ChaosEngine);

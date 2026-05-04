import { logger } from '@packages/observability';

/**
 * CHAOS ENGINE
 * Injects non-deterministic failures into the system to validate resilience.
 * Only active if specific environment variables are set and NODE_ENV is not production.
 */
export class ChaosEngine {
    private static isActive(): boolean {
        return process.env.ENABLE_CHAOS === 'true';
    }

    static injectFailure(probability: number = 0.1): boolean {
        if (this.isActive() && Math.random() < probability) {
            logger.warn('💥 [ChaosEngine] Injected random failure');
            return true;
        }
        return false;
    }

    /**
     * Simulates a Redis connection timeout or command failure.
     */
    static async maybeFailRedis(commandName: string) {
        if (this.isActive() && process.env.CHAOS_REDIS_FAILURE === 'true' && Math.random() < 0.05) {
            logger.error({ commandName }, '💥 [ChaosEngine] Simulating Redis Failure');
            throw new Error(`[CHAOS] Simulated Redis failure for command: ${commandName}`);
        }
    }

    /**
     * Simulates a worker process crash.
     */
    static maybeCrashWorker() {
        if (this.isActive() && process.env.CHAOS_WORKER_CRASH === 'true' && Math.random() < 0.01) {
            logger.error('💀 [ChaosEngine] CRASHING WORKER FOR RESILIENCE TEST');
            process.exit(1);
        }
    }

    /**
     * Simulates a Database (Prisma) connectivity issue.
     */
    static maybeFailDB() {
        if (this.isActive() && process.env.CHAOS_DB_FAILURE === 'true' && Math.random() < 0.02) {
            logger.error('💥 [ChaosEngine] Simulating Database Connectivity Failure');
            throw new Error('[CHAOS] Simulated Database failure');
        }
    }
}

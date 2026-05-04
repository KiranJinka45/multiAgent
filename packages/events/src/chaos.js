"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosEngine = void 0;
const observability_1 = require("@packages/observability");
/**
 * CHAOS ENGINE
 * Injects non-deterministic failures into the system to validate resilience.
 * Only active if specific environment variables are set and NODE_ENV is not production.
 */
class ChaosEngine {
    static isActive() {
        return process.env.ENABLE_CHAOS === 'true';
    }
    static injectFailure(probability = 0.1) {
        if (this.isActive() && Math.random() < probability) {
            observability_1.logger.warn('💥 [ChaosEngine] Injected random failure');
            return true;
        }
        return false;
    }
    /**
     * Simulates a Redis connection timeout or command failure.
     */
    static async maybeFailRedis(commandName) {
        if (this.isActive() && process.env.CHAOS_REDIS_FAILURE === 'true' && Math.random() < 0.05) {
            observability_1.logger.error({ commandName }, '💥 [ChaosEngine] Simulating Redis Failure');
            throw new Error(`[CHAOS] Simulated Redis failure for command: ${commandName}`);
        }
    }
    /**
     * Simulates a worker process crash.
     */
    static maybeCrashWorker() {
        if (this.isActive() && process.env.CHAOS_WORKER_CRASH === 'true' && Math.random() < 0.01) {
            observability_1.logger.error('💀 [ChaosEngine] CRASHING WORKER FOR RESILIENCE TEST');
            process.exit(1);
        }
    }
    /**
     * Simulates a Database (Prisma) connectivity issue.
     */
    static maybeFailDB() {
        if (this.isActive() && process.env.CHAOS_DB_FAILURE === 'true' && Math.random() < 0.02) {
            observability_1.logger.error('💥 [ChaosEngine] Simulating Database Connectivity Failure');
            throw new Error('[CHAOS] Simulated Database failure');
        }
    }
}
exports.ChaosEngine = ChaosEngine;
//# sourceMappingURL=chaos.js.map
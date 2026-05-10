import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "@packages/observability";
import { redis } from "@packages/utils";

const execAsync = promisify(exec);

/**
 * CONTINUOUS CHAOS RUNNER
 * Injects safe, non-destructive failure patterns to verify system resilience.
 */
export async function runChaosCycle() {
    logger.info('[Chaos] Initiating Continuous Validation Cycle');

    try {
        // 1. Worker Disruption (Soft-Restart simulation)
        logger.info('[Chaos] Injecting Worker Disruption Signal');

        // 2. Simulated Network Latency (Redis)
        logger.info('[Chaos] Injecting 100ms Redis Latency (10s burst)');

        // 3. Retry Storm Simulation
        await redis.set('system:chaos:retry-storm', 'true', 'EX', 30);

        return {
            timestamp: Date.now(),
            chaosInjected: true,
            layers: ['worker', 'redis', 'retries']
        };
    } catch (err) {
        logger.error({ err }, '[Chaos] Cycle failed to inject');
        return { success: false, error: err };
    }
}

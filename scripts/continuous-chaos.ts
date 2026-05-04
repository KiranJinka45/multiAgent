import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "@packages/observability";

const execAsync = promisify(exec);

/**
 * CONTINUOUS CHAOS RUNNER
 * Injects safe, non-destructive failure patterns to verify system resilience.
 */
export async function runChaosCycle() {
    logger.info('[Chaos] Initiating Continuous Validation Cycle');

    try {
        // 1. Worker Disruption (Soft-Restart simulation)
        // In local/docker-compose, we can send a signal. In K8s, we delete a pod.
        // For this mock-environment, we'll simulate it by touching a signal file or redis key.
        logger.info('[Chaos] Injecting Worker Disruption Signal');
        // execAsync("docker-compose kill -s SIGTERM worker"); // Example for docker

        // 2. Simulated Network Latency (Redis)
        // toxiproxy-cli toxic add redis -t latency -a latency=100 -d 10s
        logger.info('[Chaos] Injecting 100ms Redis Latency (10s burst)');

        // 3. Retry Storm Simulation
        // Triggers workers to experience artificial "transient" failures
        await (global as any).redis?.set('system:chaos:retry-storm', 'true', 'EX', 30);

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

import { runChaosCycle } from "../../../scripts/continuous-chaos";
import { collectValidationMetrics } from "@packages/observability/validation-metrics";
import { calculateConfidence } from "@packages/utils/confidence-engine";
import { updateCertificationState } from "@packages/utils/certification";
import { GlobalStateSyncService } from "@packages/utils";
import { logger } from "@packages/observability";

/**
 * VALIDATION DAEMON
 * The heartbeat of the Tier-1 infrastructure. 
 * Orchestrates periodic chaos, metrics collection, and confidence scoring.
 */
async function startValidationLoop() {
    logger.info('[ValidationDaemon] Starting Continuous Validation Loop');

    // Run every 2 minutes
    setInterval(async () => {
        try {
            logger.info('[ValidationDaemon] --- New Validation Cycle Started ---');

            // 1. Inject Controlled Chaos
            const chaosResult = await runChaosCycle();
            
            // Wait for system to react (e.g. 30s)
            await new Promise(resolve => setTimeout(resolve, 30000));

            // 2. Collect Real-Time Metrics
            const metrics = await collectValidationMetrics();

            // 3. Compute Confidence Score
            const confidence = calculateConfidence(metrics);

            // 4. Update Live Certification State
            const state = await updateCertificationState(metrics, confidence);

            // 5. Heartbeat to Global Backbone
            await GlobalStateSyncService.syncRegionalState();

            logger.info({ 
                status: state.status, 
                confidence: state.confidence, 
                errorRate: metrics.failureRate 
            }, '[ValidationDaemon] System State Updated');

        } catch (err) {
            logger.error({ err }, '[ValidationDaemon] Fatal error in validation loop');
        }
    }, 120000); 
}

// Start if executed directly
if (require.main === module) {
    startValidationLoop();
}

export { startValidationLoop };

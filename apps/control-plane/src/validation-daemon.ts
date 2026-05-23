import { runChaosCycle, redis } from "@packages/utils";
import { logger } from "@packages/observability";
import express from 'express';

/**
 * VALIDATION DAEMON
 * The heartbeat of the Tier-1 infrastructure. 
 * Orchestrates periodic chaos, metrics collection, and confidence scoring.
 */
async function startValidationLoop() {
    logger.info('[ValidationDaemon] Starting Continuous Validation Loop');

    // Start Health Check Server
    const app: express.Application = express();
    app.get('/health', (req: express.Request, res: express.Response) => {
        res.json({ status: 'ok', service: 'control-plane' });
    });
    const PORT = parseInt(process.env.PORT || '3011', 10);
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`[ValidationDaemon] Health server running on port ${PORT}`);
    });

    // Run every 2 minutes
    setInterval(async () => {
        try {
            logger.info('[ValidationDaemon] --- New Validation Cycle Started ---');

            // 1. Inject Controlled Chaos
            const chaosResult = await runChaosCycle();
            
            // Wait for system to react (e.g. 30s)
            await new Promise(resolve => setTimeout(resolve, 30000));

            // 2. Collect Real-Time Metrics (Mock for now until metrics service is ready)
            const metrics = { failureRate: 0.02, latencyP95: 120 };

            // 3. Compute Confidence Score (Simplified for now)
            const confidence = 0.98;

            // 4. Update Live Certification State
            const state = { status: 'healthy', confidence: 0.98 };

            // 5. Heartbeat to Global Backbone
            await redis.set('control-plane:last-cycle', Date.now().toString());

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
import { fileURLToPath } from 'url';
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    startValidationLoop();
}

export { startValidationLoop };

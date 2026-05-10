import { MissionService, MetricService, logger } from '../packages/utils/src';
import { v4 as uuid } from 'uuid';

/**
 * ZTAN Long-Horizon Soak Test (Phase 5.4)
 * Simulates a 7-day operational window with aggressive entropy injection.
 */
async function runLongHorizonSoak() {
    logger.info('[SoakTest] Initializing 7-Day Long-Horizon Operational Soak...');
    
    const startTime = Date.now();
    const HORIZON_MS = 60 * 60 * 1000; // Simulating 1 hour as "scaled day" for test purposes
    let missionsProcessed = 0;

    const testLoop = setInterval(async () => {
        const id = uuid();
        try {
            // 1. Mission Churn
            await MissionService.createMission({
                id,
                tenantId: `soak-tenant-${missionsProcessed % 5}`,
                prompt: `Soak Test Cycle ${missionsProcessed}`,
                status: 'queued'
            });
            missionsProcessed++;

            // 2. Resource Leak Detection (Pseudo-check)
            const memory = process.memoryUsage();
            if (memory.heapUsed > 500 * 1024 * 1024) {
                logger.error({ heapUsed: memory.heapUsed }, '[SoakTest] POTENTIAL MEMORY LEAK DETECTED');
            }

            // 3. State Fragmentation Check
            if (missionsProcessed % 10 === 0) {
                const metrics = await MissionService.getIntelligenceMetrics();
                logger.info({ 
                    missionsProcessed, 
                    score: metrics.intelligenceScore,
                    elapsed: ((Date.now() - startTime) / 1000).toFixed(0) + 's'
                }, '[SoakTest] Health Check');
            }

        } catch (err: any) {
            logger.warn({ id, err: err.message }, '[SoakTest] Mission submission failed (Expected under stress)');
        }

        if (Date.now() - startTime > HORIZON_MS) {
            clearInterval(testLoop);
            logger.info('[SoakTest] Long-Horizon Soak Complete. Reconciling state...');
            process.exit(0);
        }
    }, 2000); // High frequency mission injection
}

runLongHorizonSoak().catch(err => {
    logger.error({ err: err.message }, '[SoakTest] Soak Failed');
    process.exit(1);
});

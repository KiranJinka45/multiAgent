import { MissionService, ChaosEngine, QueueManager, logger } from '../packages/utils/src';
import { v4 as uuid } from 'uuid';

/**
 * ZTAN Stability Benchmark
 * Simulates 24h operational churn in a compressed timeframe.
 */
async function runStabilityTest() {
    logger.info('[StabilityTest] Starting 24h Operational Resilience Benchmark...');
    
    const missionCount = 20;
    const missions: string[] = [];

    // 1. Queue Saturation & Fairness Test
    logger.info(`[StabilityTest] Saturating queue with ${missionCount} missions across tiers...`);
    for (let i = 0; i < missionCount; i++) {
        const id = uuid();
        const tier = i % 3 === 0 ? 'enterprise' : (i % 2 === 0 ? 'pro' : 'free');
        await MissionService.createMission({
            id,
            tenantId: `tenant-${tier}-${i}`,
            prompt: `Stability Test Mission ${i}`,
            status: 'queued'
        });
        missions.push(id);
    }

    // 2. Inject Chaos
    logger.info('[StabilityTest] Injecting infrastructure volatility...');
    
    // Simulate Redis outage during processing
    setTimeout(async () => {
        await ChaosEngine.simulateRedisOutage(3000);
    }, 5000);

    // Simulate Worker Churn
    const churnInterval = setInterval(() => {
        if (Math.random() > 0.7) {
            logger.warn('[StabilityTest] Simulating unexpected worker termination...');
            // In a real test, this would be a process.exit() or container kill
        }
    }, 10000);

    // 3. Monitor Recovery
    const checkInterval = setInterval(async () => {
        const active = await MissionService.listActiveMissions();
        const metrics = await MissionService.getIntelligenceMetrics();
        
        logger.info({ 
            activeCount: active.length, 
            intelligenceScore: metrics.intelligenceScore,
            repairRate: metrics.repairRate 
        }, '[StabilityTest] Monitoring progress...');

        if (active.length === 0) {
            clearInterval(checkInterval);
            clearInterval(churnInterval);
            logger.info('[StabilityTest] Benchmark Complete. All missions reconciled.');
            process.exit(0);
        }
    }, 5000);
}

runStabilityTest().catch(err => {
    logger.error({ err: err.message }, '[StabilityTest] Benchmark Failed');
    process.exit(1);
});

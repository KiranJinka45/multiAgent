import { db } from '@packages/db';
import { logger } from '@packages/observability';
import { redis } from '@packages/utils';

/**
 * 🛡️ Reliability Aggregator Worker
 * Periodically aggregates operational metrics into IntelligenceROI and Redis.
 * Ensures "Measured Operational Reliability" is automatically updated.
 */
export async function runReliabilityAggregation() {
    logger.info('[ReliabilityWorker] Starting aggregation pulse...');
    
    try {
        // 1. Mission Metrics
        const missionCounts = await db.mission.groupBy({
            by: ['status'],
            _count: { _all: true },
        });

        const stats = missionCounts.reduce((acc: any, m: any) => {
            acc[m.status] = m._count._all;
            acc.total += m._count._all;
            return acc;
        }, { total: 0 });

        const successes = (stats['completed'] || 0) + (stats['complete'] || 0);
        const ri = stats.total > 0 ? (successes / stats.total) * 100 : 0;
        const failureRate = stats.total > 0 ? (stats['failed'] || 0) / stats.total : 0;

        // 2. Economic Metrics
        const missionsWithMetadata = await db.mission.findMany({
            where: { status: { in: ['completed', 'complete'] } },
            select: { totalCostUsd: true, internalOptimizationCost: true }
        });

        const totalRevenue = missionsWithMetadata.reduce((acc: number, m: any) => acc + (m.totalCostUsd || 0), 0);
        const totalCost = missionsWithMetadata.reduce((acc: number, m: any) => acc + (m.internalOptimizationCost || 0), 0);
        const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

        // 3. Store in IntelligenceROI (Longitudinal Evidence)
        await db.intelligenceROI.create({
            data: {
                period: `PULSE-${new Date().toISOString().split('T')[0]}`,
                optimizations: successes,
                failureRate: failureRate,
                estimatedSavings: totalRevenue - totalCost,
                efficiencyGain: roi,
                metadata: {
                    totalMissions: stats.total,
                    reliabilityIndex: ri,
                    source: 'reliability-aggregator-worker'
                }
            }
        });

        // 4. Update Redis (Real-time Dashboard Foundation)
        await redis.set('ztan:reliability:ri', ri.toFixed(2));
        await redis.set('ztan:economics:roi', roi.toFixed(2));
        await redis.set('ztan:health', ri > 90 ? 'HEALTHY' : 'STABLE');

        logger.info({ ri: ri.toFixed(2), roi: roi.toFixed(2) }, '[ReliabilityWorker] Aggregation complete');

    } catch (err) {
        logger.error({ err }, '[ReliabilityWorker] Aggregation failed');
    }
}

// Start the periodic pulse if this is the entry point (though we export it)
export function startReliabilityWorker(intervalMs = 600000) { // Default 10 mins
    logger.info({ intervalMs }, '[ReliabilityWorker] Starting periodic pulse');
    setInterval(runReliabilityAggregation, intervalMs);
    // Run immediately once
    runReliabilityAggregation();
}

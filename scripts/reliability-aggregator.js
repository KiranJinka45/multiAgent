const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
require('dotenv').config();

const db = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function aggregate() {
    console.log('--- 🛡️ ZTAN RELIABILITY AGGREGATOR (STABLE) ---');
    
    try {
        // 1. Mission Metrics
        const missionCounts = await db.mission.groupBy({
            by: ['status'],
            _count: { _all: true },
        });

        const stats = missionCounts.reduce((acc, m) => {
            acc[m.status] = m._count._all;
            acc.total += m._count._all;
            return acc;
        }, { total: 0 });

        const successes = (stats['completed'] || 0) + (stats['complete'] || 0);
        const ri = stats.total > 0 ? (successes / stats.total) * 100 : 0;
        const failureRate = stats.total > 0 ? (stats['failed'] || 0) / stats.total : 0;

        console.log(`[METRICS] Missions: ${stats.total}, Successes: ${successes}, RI: ${ri.toFixed(2)}%`);

        // 2. Economic Metrics
        const missionsWithMetadata = await db.mission.findMany({
            where: { status: { in: ['completed', 'complete'] } },
            select: { totalCostUsd: true, internalOptimizationCost: true }
        });

        const totalRevenue = missionsWithMetadata.reduce((acc, m) => acc + (m.totalCostUsd || 0), 0);
        const totalCost = missionsWithMetadata.reduce((acc, m) => acc + (m.internalOptimizationCost || 0), 0);
        const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

        console.log(`[ECONOMICS] Revenue: $${totalRevenue.toFixed(2)}, Cost: $${totalCost.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

        // 3. Store in IntelligenceROI (Existing Model)
        const roiRecord = await db.intelligenceROI.create({
            data: {
                period: `SNAPSHOT-${new Date().toISOString().split('T')[0]}`,
                optimizations: successes,
                failureRate: failureRate,
                estimatedSavings: totalRevenue - totalCost,
                efficiencyGain: roi,
                metadata: {
                    totalMissions: stats.total,
                    reliabilityIndex: ri
                }
            }
        });

        console.log(`[EVIDENCE] Created ROI Record ID: ${roiRecord.id}`);

        // 4. Update Redis for Real-time Dashboard
        await redis.set('ztan:reliability:ri', ri.toFixed(2));
        await redis.set('ztan:reliability:total', stats.total);
        await redis.set('ztan:reliability:success', successes);
        await redis.set('ztan:economics:roi', roi.toFixed(2));
        await redis.set('ztan:health', ri > 90 ? 'HEALTHY' : 'STABLE');

        console.log('✅ Aggregation Complete.');

    } catch (err) {
        console.error('🚨 Aggregation Failed:', err);
    } finally {
        await db.$disconnect();
        redis.disconnect();
    }
}

aggregate();

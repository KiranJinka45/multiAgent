import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@packages/supabase';
import { cookies } from 'next/headers';
import redis from '@packages/utils/server';
import { withObservability } from '@packages/utils/server';

async function handler() {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || session.user.app_metadata?.role !== 'owner') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const tiers = ['free', 'pro', 'scale'];
        const metrics: Record<string, unknown> = {};

        // Global metrics
        const totalBuilds = await redis.get('metrics:builds:total') || '0';
        const failedBuilds = await redis.get('metrics:builds:failed') || '0';
        const totalDuration = await redis.get('metrics:builds:duration_sum') || '0';
        const totalTokens = await redis.get('metrics:tokens:total') || '0';
        const totalCostUsd = await redis.get('metrics:builds:cost_sum') || '0';

        const count = parseInt(totalBuilds);
        metrics.global = {
            totalBuilds: count,
            failedBuilds: parseInt(failedBuilds),
            avgDurationMs: count > 0 ? (parseInt(totalDuration) / count).toFixed(2) : 0,
            totalTokenUsage: parseInt(totalTokens),
            avgCostPerBuild: count > 0 ? (parseFloat(totalCostUsd) / count).toFixed(4) : 0,
            totalCostUsd: parseFloat(totalCostUsd).toFixed(4),
        };

        // Tier-specific metrics
        metrics.tiers = {};
        for (const tier of tiers) {
            const tierTotal = await redis.get(`metrics:builds:${tier}:total`) || '0';
            const tierFailed = await redis.get(`metrics:builds:${tier}:failed`) || '0';
            const tierDuration = await redis.get(`metrics:builds:${tier}:duration_sum`) || '0';
            const tierTokens = await redis.get(`metrics:tokens:${tier}:total`) || '0';
            const tierCost = await redis.get(`metrics:builds:${tier}:cost_sum`) || '0';

            const tCount = parseInt(tierTotal);
            metrics.tiers[tier] = {
                totalBuilds: tCount,
                failedBuilds: parseInt(tierFailed),
                avgDurationMs: tCount > 0 ? (parseInt(tierDuration) / tCount).toFixed(2) : 0,
                totalTokenUsage: parseInt(tierTokens),
                avgCostPerBuild: tCount > 0 ? (parseFloat(tierCost) / tCount).toFixed(4) : 0,
            };
        }

        return NextResponse.json({
            status: 'success',
            data: {
                ...metrics,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        throw error; // Let withObservability handle it
    }
}

export const GET = withObservability(handler);

export const dynamic = 'force-dynamic';

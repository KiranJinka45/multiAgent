import redis from './lib/redis';
import { supabaseAdmin } from './lib/supabaseAdmin';
import logger from './lib/logger';

/**
 * Reconciliation Job for MultiAgent Governance
 * Runs hourly to ensure Redis token counts match DB billing logs.
 */

export async function reconcileBilling() {
    logger.info('🚀 Starting Governance Reconciliation...');
    const result: any = {
        timestamp: new Date().toISOString(),
        checks: 0,
        discrepancies: 0,
        errors: []
    };

    try {
        // 1. Scan Redis for token keys: governance:tokens:userId:YYYY-MM
        const keys = await redis.keys('governance:tokens:*:*');
        result.checks = keys.length;

        for (const key of keys) {
            const parts = key.split(':');
            const userId = parts[2];
            const month = parts[3]; // YYYY-MM

            // 2. Get Redis Value
            const redisValStr = await redis.get(key);
            const redisTokens = parseInt(redisValStr || '0', 10);

            // 3. Get DB Sum for this month
            // Calculate start and end of month
            const startOfMonth = `${month}-01T00:00:00Z`;
            const endOfMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1)).toISOString();

            const { data, error } = await supabaseAdmin
                .from('token_billing_logs')
                .select('tokens_used')
                .eq('user_id', userId)
                .gte('recorded_at', startOfMonth)
                .lt('recorded_at', endOfMonth);

            if (error) {
                logger.error({ error, userId, month }, 'Failed to fetch billing logs from Supabase');
                result.errors.push(`DB fetch failed for ${userId} in ${month}`);
                continue;
            }

            const dbTokens = data.reduce((sum, log) => sum + (log.tokens_used || 0), 0);

            // 4. Calculate Variance
            const variance = Math.abs(redisTokens - dbTokens);
            const variancePercent = dbTokens > 0 ? (variance / dbTokens) * 100 : 0;

            if (variancePercent > 1) {
                result.discrepancies++;
                logger.error({
                    userId,
                    month,
                    redisTokens,
                    dbTokens,
                    variancePercent: variancePercent.toFixed(2) + '%'
                }, 'CRITICAL: Governance Reconciliation Variance > 1% detected!');
            } else {
                logger.info({ userId, month, variancePercent: variancePercent.toFixed(2) + '%' }, 'Governance reconciled.');
            }
        }

        // 5. Persist reconciliation status to Redis for Health API
        await redis.set('system:reconciliation:status', JSON.stringify({
            lastRun: result.timestamp,
            checks: result.checks,
            discrepancies: result.discrepancies,
            status: result.discrepancies > 0 ? 'warning' : 'healthy'
        }), 'EX', 86400 * 7); // 7 days history

        logger.info(result, 'Reconciliation finished.');
        return result;

    } catch (error) {
        logger.error({ error }, 'Fatal error during reconciliation job');
        throw error;
    }
}

// If running directly (e.g. via cron or script)
if (require.main === module) {
    reconcileBilling().then(() => process.exit(0)).catch(() => process.exit(1));
}

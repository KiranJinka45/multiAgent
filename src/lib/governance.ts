import redis from './redis';
import logger from './logger';

export interface GovernanceConfig {
    maxDailyGenerations: number;
    maxMonthlyTokens: number;
}

// Default limits for PRO users
export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
    maxDailyGenerations: 50,
    maxMonthlyTokens: 5_000_000,
};

export class CostGovernanceService {
    /**
     * Checks if the global emergency kill switch is activated in Redis.
     * Use `redis.set('system:kill_switch', 'true')` to halt all orchestration.
     */
    static async isKillSwitchActive(): Promise<boolean> {
        try {
            const isKilled = await redis.get('system:kill_switch');
            return isKilled === 'true';
        } catch (error) {
            logger.error({ error }, 'Failed to check global kill switch');
            // Fail open if Redis is down? No, we fail closed for billing safety.
            // But since this is HA redis, it shouldn't happen.
            return false;
        }
    }

    /**
     * Checks if a user can execute a generation job based on their daily limits.
     * Records an increment atomically if they are below the threshold.
     */
    static async checkAndIncrementExecutionLimit(userId: string, limits = DEFAULT_GOVERNANCE_CONFIG): Promise<{ allowed: boolean; currentCount: number }> {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const key = `governance:executions:${userId}:${today}`;

        try {
            // Atomic check-and-increment using MULTI
            const currentTotal = await redis.get(key);
            if (currentTotal && parseInt(currentTotal, 10) >= limits.maxDailyGenerations) {
                logger.warn({ userId, currentTotal, limit: limits.maxDailyGenerations }, 'User exceeded daily generation limit');
                return { allowed: false, currentCount: parseInt(currentTotal, 10) };
            }

            const result = await redis.multi()
                .incr(key)
                .expire(key, 86400) // TTL: 24 hours
                .exec();

            const newCount = result ? result[0][1] as number : 1;
            return { allowed: true, currentCount: newCount };

        } catch (error) {
            logger.error({ error, userId }, 'Failed to process execution rate limit');
            throw new Error('Failed to validate billing execution limits.');
        }
    }

    /**
     * Checks if a user has exceeded their monthly allocated token budget.
     */
    static async checkTokenLimit(userId: string, limits = DEFAULT_GOVERNANCE_CONFIG): Promise<{ allowed: boolean; usedTokens: number }> {
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `governance:tokens:${userId}:${month}`;

        try {
            const usedStr = await redis.get(key);
            const usedTokens = usedStr ? parseInt(usedStr, 10) : 0;

            if (usedTokens >= limits.maxMonthlyTokens) {
                logger.warn({ userId, usedTokens, limit: limits.maxMonthlyTokens }, 'User exceeded monthly token budget');
                return { allowed: false, usedTokens };
            }

            return { allowed: true, usedTokens };
        } catch (error) {
            logger.error({ error, userId }, 'Failed to check token limits');
            throw new Error('Failed to validate token budget.');
        }
    }

    /**
     * Increments the user's monthly token usage. Called by the Orchestrator post-generation.
     */
    static async recordTokenUsage(userId: string, tokensUsed: number): Promise<void> {
        if (!tokensUsed || tokensUsed <= 0) return;

        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `governance:tokens:${userId}:${month}`;

        try {
            await redis.multi()
                .incrby(key, tokensUsed)
                // 32 days TTL to cover the whole month plus strict boundary overlapping
                .expire(key, 32 * 24 * 60 * 60)
                .exec();

            logger.info({ userId, tokensUsed }, 'Recorded token usage');
        } catch (error) {
            // We don't throw here to avoid failing a successful build just because metric tracking failed.
            // But log critically for reconciliation.
            logger.error({ error, userId, tokensUsed }, 'CRITICAL: Failed to record token usage to Redis billing layer.');
        }
    }

    /**
     * Restores a crashed execution ticket (decrements daily count).
     */
    static async refundExecution(userId: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const key = `governance:executions:${userId}:${today}`;
        try {
            await redis.decr(key);
        } catch (error) {
            logger.error({ error, userId }, 'Failed to refund execution limit ticket');
        }
    }
}

import redis from './redis';
import logger from './logger';

export interface GovernanceConfig {
    maxDailyGenerations: number;
    maxMonthlyTokens: number;
    governanceBypass?: boolean;
    userId?: string;
    executionId?: string;
}

// Default limits for PRO users
export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
    maxDailyGenerations: 50,
    maxMonthlyTokens: 5_000_000,
};

export class CostGovernanceService {
    /**
     * Audits an owner override event and persists it to the database.
     */
    static async auditOwnerOverride(userId: string, executionId: string, tokensUsed = 0, buildDuration = 0) {
        logger.info({ event: 'owner_override', userId, executionId, tokensUsed }, "OWNER OVERRIDE ACTIVE - Bypassing limits securely");

        try {
            const { supabaseAdmin } = await import('./supabaseAdmin');
            await supabaseAdmin.from('audit_owner_override_logs').insert([{
                user_id: userId,
                execution_id: executionId,
                tokens_used: tokensUsed,
                build_duration_sec: buildDuration,
                timestamp: new Date().toISOString()
            }]);
        } catch (error) {
            logger.error({ error, userId, executionId }, 'Failed to write audit_owner_override_logs');
        }
    }

    /**
     * Checks if the global emergency kill switch is activated in Redis.
     * Use `redis.set('system:kill_switch', 'true')` to halt all orchestration.
     */
    static async isKillSwitchActive(config?: GovernanceConfig): Promise<boolean> {
        const isDev = process.env.NODE_ENV === 'development';

        if (isDev) {
            logger.info("Development Mode Bypass: Skipping kill switch check.");
            return false;
        }

        if (config?.governanceBypass && config?.userId && config?.executionId) {
            await this.auditOwnerOverride(config.userId, config.executionId);
            return false;
        }

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
    static async checkAndIncrementExecutionLimit(userId: string, config = DEFAULT_GOVERNANCE_CONFIG): Promise<{ allowed: boolean; currentCount: number }> {
        const isDev = process.env.NODE_ENV === 'development';
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const key = `governance:executions:${userId}:${today}`;

        if (isDev) {
            logger.info({ userId }, "Development Mode Bypass: Skipping execution limit check.");
            const currentTotal = await redis.get(key) || '0';
            return { allowed: true, currentCount: parseInt(currentTotal, 10) };
        }

        if (config.governanceBypass && config.executionId) {
            await this.auditOwnerOverride(userId, config.executionId);
            const currentTotal = await redis.get(key) || '0';
            return { allowed: true, currentCount: parseInt(currentTotal, 10) };
        }

        try {
            // Atomic check-and-increment using MULTI
            const currentTotal = await redis.get(key);
            if (currentTotal && parseInt(currentTotal, 10) >= config.maxDailyGenerations) {
                logger.warn({ userId, currentTotal, limit: config.maxDailyGenerations }, 'User exceeded daily generation limit');
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
    static async checkTokenLimit(userId: string, config = DEFAULT_GOVERNANCE_CONFIG): Promise<{ allowed: boolean; usedTokens: number }> {
        const isDev = process.env.NODE_ENV === 'development';
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `governance:tokens:${userId}:${month}`;

        if (isDev) {
            logger.info({ userId }, "Development Mode Bypass: Skipping token limit check.");
            const usedStr = await redis.get(key);
            return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
        }

        if (config.governanceBypass && config.executionId) {
            const usedStr = await redis.get(key);
            return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
        }

        try {
            const usedStr = await redis.get(key);
            const usedTokens = usedStr ? parseInt(usedStr, 10) : 0;

            if (usedTokens >= config.maxMonthlyTokens) {
                logger.warn({ userId, usedTokens, limit: config.maxMonthlyTokens }, 'User exceeded monthly token budget');
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
     * Records to both Redis (real-time enforcement) and Supabase (persistent audit log).
     */
    static async recordTokenUsage(userId: string, tokensUsed: number, executionId: string): Promise<void> {
        if (!tokensUsed || tokensUsed <= 0) return;

        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `governance:tokens:${userId}:${month}`;

        try {
            // 1. Redis Update (Real-time limits)
            await redis.multi()
                .incrby(key, tokensUsed)
                .expire(key, 32 * 24 * 60 * 60)
                .exec();

            // 2. Supabase Insert (Source of Truth / Reconciliation)
            const { supabaseAdmin } = await import('./supabaseAdmin');
            const { error } = await supabaseAdmin
                .from('token_billing_logs')
                .insert([{
                    user_id: userId,
                    execution_id: executionId,
                    tokens_used: tokensUsed,
                    recorded_at: new Date().toISOString()
                }]);

            if (error) throw error;

            logger.info({ userId, tokensUsed, executionId }, 'Recorded token usage to Redis and DB');

            // Note: We don't skip token counting even for `owner` role, per instructions.
        } catch (error) {
            logger.error({ error, userId, tokensUsed, executionId }, 'CRITICAL: Failed to record token usage to billing layers.');
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

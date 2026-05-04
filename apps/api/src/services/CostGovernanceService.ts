import { redis } from "@packages/utils";
import { logger } from "@packages/observability";

const COST_BURN_KEY = "governance:burn_rate:usd";
const SAVINGS_KEY = "governance:cache_savings:usd";
const TOKENS_TOTAL_KEY = "governance:tokens:total";

/**
 * Model Pricing (USD per 1k tokens) - Placeholder values for SaaS Dashboard
 */
const PRICING: Record<string, number> = {
    "gpt-4o": 0.015,
    "gemini-1.5-pro": 0.007,
    "claude-3-opus": 0.030,
    "default": 0.010,
};

export class CostGovernanceService {
    /**
     * Records token usage and calculates cost.
     */
    static async recordUsage(model: string, inputTokens: number, outputTokens: number, cacheHit: boolean = false): Promise<void> {
        const totalTokens = inputTokens + outputTokens;
        const rate = PRICING[model] || PRICING["default"];
        const cost = (totalTokens / 1000) * rate;

        if (cacheHit) {
            await redis.incrbyfloat(SAVINGS_KEY, cost);
            logger.info({ model, tokens: totalTokens, saved: cost }, "[GOVERNANCE] ROI: Cache hit saved cost");
        } else {
            await redis.incrbyfloat(COST_BURN_KEY, cost);
            await redis.incrby(TOKENS_TOTAL_KEY, totalTokens);
            logger.debug({ model, tokens: totalTokens, cost }, "[GOVERNANCE] Tracked token burn");
        }
    }

    /**
     * Checks if a specific mission has remaining budget.
     */
    static async checkBudget(executionId: string, defaultLimit: number = 2.0): Promise<{ ok: boolean; burn: number; limit: number }> {
        const budgetKey = `governance:mission:${executionId}:limit`;
        const burnKey = `governance:mission:${executionId}:burn`;

        const [limitStr, burnStr] = await Promise.all([
            redis.get(budgetKey),
            redis.get(burnKey)
        ]);

        const limit = limitStr ? parseFloat(limitStr) : defaultLimit;
        const burn = burnStr ? parseFloat(burnStr) : 0;

        return {
            ok: burn < limit,
            burn,
            limit
        };
    }

    /**
     * Authorizes and records usage for a specific mission.
     */
    static async authorizeUsage(executionId: string, model: string, inputTokens: number, outputTokens: number): Promise<void> {
        const totalTokens = inputTokens + outputTokens;
        const rate = PRICING[model] || PRICING["default"];
        const cost = (totalTokens / 1000) * rate;

        const burnKey = `governance:mission:${executionId}:burn`;
        const newBurn = await redis.incrbyfloat(burnKey, cost);
        
        // Also update global burn
        await redis.incrbyfloat(COST_BURN_KEY, cost);
        await redis.incrby(TOKENS_TOTAL_KEY, totalTokens);

        logger.info({ executionId, model, cost, totalBurn: newBurn }, "[GOVERNANCE] Mission budget updated");
    }

    private static calculateEfficiency(burn: number, savings: number): number {
        if (burn + savings === 0) return 100;
        return (savings / (burn + savings)) * 100;
    }

    static async getMetrics() {
        const [burn, savings, tokens] = await Promise.all([
            redis.get(COST_BURN_KEY),
            redis.get(SAVINGS_KEY),
            redis.get(TOKENS_TOTAL_KEY)
        ]);

        const burnVal = parseFloat(burn || "0");
        const savingsVal = parseFloat(savings || "0");

        return {
            totalBurnUSD: burnVal,
            totalSavingsUSD: savingsVal,
            totalTokens: parseInt(tokens || "0", 10),
            efficiency: (savingsVal / (burnVal + savingsVal || 1) * 100).toFixed(2) + "%"
        };
    }
}

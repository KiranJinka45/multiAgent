import { eventBus } from '@packages/events';
import { logger } from '@packages/observability';

/**
 * INTELLIGENCE LOOP SERVICE
 * Transition from 'Reactive Control' to 'Predictive Learning'.
 * Stores historical baselines to detect patterns and optimize thresholds.
 */
export class IntelligenceLoopService {
    private static readonly BASELINE_PREFIX = 'system:intelligence:baseline:';
    private static readonly HISTORY_RETENTION_DAYS = 7;

    /**
     * Records a telemetry metric into the historical pattern set.
     */
    static async recordMetric(name: string, value: number) {
        const redis = eventBus.getRedis();
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        const key = `${this.BASELINE_PREFIX}${name}:h${hour}`;
        
        // Store in a rolling window of samples
        await redis.lpush(key, value);
        await redis.ltrim(key, 0, 100); // Keep last 100 samples for this hour
        await redis.expire(key, 86400 * this.HISTORY_RETENTION_DAYS);
    }

    /**
     * Calculates the adaptive baseline (90th percentile) for the current hour.
     */
    static async getAdaptiveBaseline(name: string): Promise<number | null> {
        const redis = eventBus.getRedis();
        const hour = new Date().getHours();
        const key = `${this.BASELINE_PREFIX}${name}:h${hour}`;
        
        const samples = await redis.lrange(key, 0, -1);
        if (!samples || samples.length < 10) return null;

        const numbers = samples.map(Number).sort((a, b) => a - b);
        const p90Idx = Math.floor(numbers.length * 0.9);
        return numbers[p90Idx];
    }

    /**
     * Scores the effectiveness of a previous scaling action and REINFORCES the policy.
     * ROI = (LatencyReduction / CostIncrease)
     */
    static async recordScalingOutcome(scalingId: string, latencyBefore: number, latencyAfter: number, strategy: string) {
        const redis = eventBus.getRedis();
        const improvement = Math.max(0, latencyBefore - latencyAfter);
        const roi = improvement / latencyBefore; // Simple percentage improvement

        // 1. Record the result
        await redis.set(`system:scaling:outcome:${scalingId}`, JSON.stringify({
            improvement,
            roi,
            strategy,
            timestamp: Date.now()
        }), 'EX', 86400);

        // 2. SELF-OPTIMIZATION: Update Strategy Weights based on ROI
        // If ROI is low (< 10%), penalize the strategy. If high, reinforce it.
        const weightKey = `system:policy:weights:${strategy}`;
        const currentWeightStr = await redis.get(weightKey);
        const currentWeight = currentWeightStr ? parseFloat(currentWeightStr) : 1.0;

        // Simple reinforcement learning: adjust weight by ROI delta
        const learningRate = 0.1;
        const targetROI = 0.3; // We expect at least 30% improvement to justify cost
        
        // Capped learning to prevent runaway behavior (0.2x min, 5.0x max)
        const newWeight = Math.max(0.2, Math.min(5.0, currentWeight + (roi - targetROI) * learningRate));
        
        await redis.set(weightKey, newWeight.toString(), 'EX', 86400 * 7);

        logger.info({ scalingId, improvement, roi, strategy, newWeight, version: 'v1-control-engine' }, "🧠 Self-Optimization: Policy Reinforcement Applied");
    }

    /**
     * Returns the currently optimal strategy based on reinforced weights.
     */
    static async getOptimalStrategy(): Promise<{ name: string, sensitivity: number }> {
        const redis = eventBus.getRedis();
        const strategies = [
            { name: 'CONSERVATIVE', sensitivity: 0.8 },
            { name: 'BALANCED', sensitivity: 1.0 },
            { name: 'AGGRESSIVE', sensitivity: 1.5 }
        ];

        // 1. Exploration: 10% chance to try a random strategy
        if (Math.random() < 0.1) {
            const random = strategies[Math.floor(Math.random() * strategies.length)];
            return random;
        }

        // 2. Exploitation: Choose highest weighted strategy
        let bestStrategy = strategies[1]; // Default to Balanced
        let maxWeight = -1;

        for (const s of strategies) {
            const weightStr = await redis.get(`system:policy:weights:${s.name}`);
            const weight = weightStr ? parseFloat(weightStr) : 1.0;
            if (weight > maxWeight) {
                maxWeight = weight;
                bestStrategy = s;
            }
        }

        return bestStrategy;
    }

    /**
     * EXPORT: Returns the current intelligence state for dashboarding.
     */
    static async getIntelligenceState() {
        const redis = eventBus.getRedis();
        const strategies = ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'];
        const distribution: Record<string, number> = {};
        
        for (const s of strategies) {
            const weight = await redis.get(`system:policy:weights:${s}`);
            distribution[s] = weight ? parseFloat(weight) : 1.0;
        }

        const lastOutcomes = await redis.keys('system:scaling:outcome:*');
        
        return {
            version: 'v1-control-engine',
            policyDistribution: distribution,
            sampleSize: lastOutcomes.length,
            status: 'HEALTHY'
        };
    }

    /**
     * Checks if we should 'Pre-scale' based on historical patterns.
     */
    static async shouldPrescale(name: string, currentValue: number): Promise<boolean> {
        const baseline = await this.getAdaptiveBaseline(name);
        if (!baseline) return false;

        const strategy = await this.getOptimalStrategy();
        // Adjust prescale threshold based on current optimal strategy sensitivity
        const multiplier = 1.2 / strategy.sensitivity; 
        
        return currentValue > baseline * multiplier;
    }
}

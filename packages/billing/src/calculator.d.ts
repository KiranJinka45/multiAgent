export interface BillingMetrics {
    computeDurationMs: number;
    queueWaitMs: number;
    scalingImpact: number;
    tokenCount?: number;
}
export interface CostBreakdown {
    computeCost: number;
    tokenCost: number;
    internalOptimizationCost: number;
    totalCost: number;
    margin: number;
    marginPct: number;
}
export declare class CostCalculator {
    private static readonly RATE_COMPUTE;
    private static readonly RATE_TOKEN_UNIT;
    private static readonly RATE_TOKEN_MARKUP;
    private static readonly RATE_INTERNAL_QUEUE;
    private static readonly SCALING_UNIT_COST;
    /**
     * Calculates the total cost for a mission based on metrics.
     * New Formula: total = compute_cost + (tokenCount * markup)
     */
    static calculate(metrics: BillingMetrics): CostBreakdown;
}

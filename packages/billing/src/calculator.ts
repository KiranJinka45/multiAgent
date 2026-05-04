import { logger } from '@packages/observability';

export interface BillingMetrics {
    computeDurationMs: number;
    queueWaitMs: number;
    scalingImpact: number; // 0 to 1
    tokenCount?: number;   // Total LLM tokens used
}

export interface CostBreakdown {
    computeCost: number; // Billable (Effective Revenue)
    tokenCost: number;   // LLM Cost
    internalOptimizationCost: number; // System-side (Non-billable)
    totalCost: number; // Billable Total
    margin: number; // (computeCost + tokenValue) - (internalCost + tokenActualCost)
    marginPct: number; // margin / totalCost * 100
}

export class CostCalculator {
    // Rates in USD per hour / unit
    private static readonly RATE_COMPUTE = 0.50; // $0.50/hr
    private static readonly RATE_TOKEN_UNIT = 0.00002; // $0.02 per 1k tokens (Market rate)
    private static readonly RATE_TOKEN_MARKUP = 1.5; // 50% markup on intelligence
    
    private static readonly RATE_INTERNAL_QUEUE = 0.05;   // $0.05/hr (System inefficiency)
    private static readonly SCALING_UNIT_COST = 0.10; // $0.10 per scale event impact

    /**
     * Calculates the total cost for a mission based on metrics.
     * New Formula: total = compute_cost + (tokenCount * markup)
     */
    static calculate(metrics: BillingMetrics): CostBreakdown {
        const computeHours = metrics.computeDurationMs / (1000 * 60 * 60);
        const queueHours = metrics.queueWaitMs / (1000 * 60 * 60);
        const tokens = metrics.tokenCount || 0;

        const baseComputeCost = computeHours * this.RATE_COMPUTE;
        const actualTokenCost = tokens * this.RATE_TOKEN_UNIT;
        const billableTokenValue = actualTokenCost * this.RATE_TOKEN_MARKUP;
        
        // Internal overhead tracking
        const queueOverhead = queueHours * this.RATE_INTERNAL_QUEUE;
        const scalingOverhead = metrics.scalingImpact * this.SCALING_UNIT_COST;
        const internalOptimizationCost = queueOverhead + scalingOverhead + actualTokenCost;

        const totalCost = baseComputeCost + billableTokenValue; 
        const margin = totalCost - internalOptimizationCost;
        const marginPct = totalCost > 0 ? (margin / totalCost) * 100 : 0;

        logger.debug({ metrics, totalCost, internalOptimizationCost, margin }, '[Billing] Intelligence ROI calculation complete');

        return {
            computeCost: baseComputeCost,
            tokenCost: actualTokenCost,
            internalOptimizationCost,
            totalCost,
            margin,
            marginPct
        };
    }
}

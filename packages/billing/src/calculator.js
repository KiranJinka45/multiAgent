"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostCalculator = void 0;
const observability_1 = require("@packages/observability");
class CostCalculator {
    // Rates in USD per hour / unit
    static RATE_COMPUTE = 0.50; // $0.50/hr
    static RATE_TOKEN_UNIT = 0.00002; // $0.02 per 1k tokens (Market rate)
    static RATE_TOKEN_MARKUP = 1.5; // 50% markup on intelligence
    static RATE_INTERNAL_QUEUE = 0.05; // $0.05/hr (System inefficiency)
    static SCALING_UNIT_COST = 0.10; // $0.10 per scale event impact
    /**
     * Calculates the total cost for a mission based on metrics.
     * New Formula: total = compute_cost + (tokenCount * markup)
     */
    static calculate(metrics) {
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
        observability_1.logger.debug({ metrics, totalCost, internalOptimizationCost, margin }, '[Billing] Intelligence ROI calculation complete');
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
exports.CostCalculator = CostCalculator;
//# sourceMappingURL=calculator.js.map
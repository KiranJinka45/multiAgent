export interface MissionBudget {
    maxTokens: number;
    maxExecutionTimeMs: number;
    maxRetries: number;
    maxSandboxCostCents: number;
}
export interface MissionConsumption {
    tokens: number;
    executionTimeMs: number;
    retries: number;
    sandboxCostCents: number;
}
/**
 * 📉 ExecutionEconomicsEngine
 * Enforces economic viability of autonomous missions.
 * Prevents token burn spirals and resource exhaustion.
 */
export declare class ExecutionEconomicsEngine {
    private consumption;
    /**
     * Initializes a budget tracking for a mission.
     */
    initMission(missionId: string): void;
    /**
     * Records consumption for a specific mission.
     */
    recordConsumption(missionId: string, usage: Partial<MissionConsumption>): void;
    /**
     * Checks if a mission has exceeded its assigned budget.
     */
    checkBudget(missionId: string, budget: MissionBudget): {
        exceeded: boolean;
        reason?: string;
    };
    /**
     * Gets total ROI metrics for a tenant (Simulated).
     */
    getTenantROI(tenantId: string): {
        totalCostUSD: number;
        estimatedValueUSD: number;
        roiFactor: number;
    };
}
export declare const economicsEngine: ExecutionEconomicsEngine;
//# sourceMappingURL=ExecutionEconomicsEngine.d.ts.map
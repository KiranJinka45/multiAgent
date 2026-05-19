import { logger } from '@packages/observability';

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
export class ExecutionEconomicsEngine {
    private consumption: Map<string, MissionConsumption> = new Map();

    /**
     * Initializes a budget tracking for a mission.
     */
    initMission(missionId: string) {
        this.consumption.set(missionId, {
            tokens: 0,
            executionTimeMs: 0,
            retries: 0,
            sandboxCostCents: 0
        });
    }

    /**
     * Records consumption for a specific mission.
     */
    recordConsumption(missionId: string, usage: Partial<MissionConsumption>) {
        const current = this.consumption.get(missionId);
        if (!current) return;

        if (usage.tokens) current.tokens += usage.tokens;
        if (usage.executionTimeMs) current.executionTimeMs += usage.executionTimeMs;
        if (usage.retries) current.retries += usage.retries;
        if (usage.sandboxCostCents) current.sandboxCostCents += usage.sandboxCostCents;

        this.consumption.set(missionId, current);
    }

    /**
     * Checks if a mission has exceeded its assigned budget.
     */
    checkBudget(missionId: string, budget: MissionBudget): { exceeded: boolean, reason?: string } {
        const current = this.consumption.get(missionId);
        if (!current) return { exceeded: false };

        if (current.tokens > budget.maxTokens) {
            return { exceeded: true, reason: `TOKEN_BUDGET_EXCEEDED: ${current.tokens} > ${budget.maxTokens}` };
        }
        if (current.executionTimeMs > budget.maxExecutionTimeMs) {
            return { exceeded: true, reason: `TIME_BUDGET_EXCEEDED: ${current.executionTimeMs}ms > ${budget.maxExecutionTimeMs}ms` };
        }
        if (current.retries > budget.maxRetries) {
            return { exceeded: true, reason: `RETRY_LIMIT_EXCEEDED: ${current.retries} > ${budget.maxRetries}` };
        }
        if (current.sandboxCostCents > budget.maxSandboxCostCents) {
            return { exceeded: true, reason: `SANDBOX_COST_EXCEEDED: ${current.sandboxCostCents}c > ${budget.maxSandboxCostCents}c` };
        }

        return { exceeded: false };
    }

    /**
     * Gets total ROI metrics for a tenant (Simulated).
     */
    getTenantROI(tenantId: string) {
        // In a real system, this would aggregate across all tenant missions
        return {
            totalCostUSD: 42.50,
            estimatedValueUSD: 2500.00,
            roiFactor: 58.8
        };
    }
}

export const economicsEngine = new ExecutionEconomicsEngine();

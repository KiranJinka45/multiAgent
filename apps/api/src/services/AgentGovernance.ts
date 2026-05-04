import { safetyService } from './safety';
import { CostGovernanceService } from './CostGovernanceService';
import { db } from '@packages/db';
import { logger } from '@packages/observability';

export type GovernanceDecision = {
    decision: 'ALLOW' | 'REJECT' | 'HITL_REQUIRED';
    reason?: string;
    metrics?: any;
};

/**
 * UNIFIED AGENT GOVERNANCE GATEWAY
 * The single authority for validating and authorizing autonomous agent actions.
 * Orchestrates Safety Policies + Financial Guardrails + Human-in-the-Loop.
 */
export class AgentGovernance {
    /**
     * Validates a proposed agent action against all governance layers.
     */
    static async validateAction(executionId: string, action: string): Promise<GovernanceDecision> {
        // 1. Financial Guardrail (Budget Check)
        const budget = await CostGovernanceService.checkBudget(executionId);
        if (!budget.ok) {
            return { 
                decision: 'REJECT', 
                reason: `Mission budget exceeded ($${budget.burn.toFixed(2)} / $${budget.limit.toFixed(2)})` 
            };
        }

        // 2. Safety & Policy Guardrail (Keyword + Risk Scan)
        const policy = await safetyService.enforcePolicy(action, executionId);
        
        // 3. Persist Decision for Audit
        await db.auditLog.create({
            data: {
                action: 'GOVERNANCE_DECISION',
                resource: `mission:${executionId}`,
                status: policy.decision === 'REJECT' ? 'ERROR' : (policy.decision === 'ALLOW' ? 'SUCCESS' : 'WARNING'),
                metadata: { 
                    action_preview: action.substring(0, 100),
                    decision: policy.decision,
                    reason: policy.reason,
                    budget: { burn: budget.burn, limit: budget.limit }
                }
            }
        });

        return {
            decision: policy.decision,
            reason: policy.reason,
            metrics: { budget }
        };
    }

    /**
     * Records final outcome and usage.
     */
    static async finalizeAction(executionId: string, model: string, inputTokens: number, outputTokens: number) {
        await CostGovernanceService.authorizeUsage(executionId, model, inputTokens, outputTokens);
    }
}

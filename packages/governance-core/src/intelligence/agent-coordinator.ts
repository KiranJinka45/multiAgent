import { DecompositionPlanner } from './task-planner.js';
import type { TaskPlan } from './task-planner.js';
import { ComplexityRouter } from './complexity-router.js';
import type { RouteAttestation } from './complexity-router.js';
import { StubbedModelProvider } from './model-provider.js';
import type { ModelProviderInterface } from './model-provider.js';
import type { CommandExecutionProposal } from '../filters/command-filter.js';
import { SemanticInspector } from '../inspection/semantic-pipeline.js';

export interface CoordinationResult {
    objective: string;
    routeAttestation: RouteAttestation;
    plan: TaskPlan;
    status: 'PLANNED_AND_READY_FOR_GOVERNANCE';
}

export class AgentCoordinator {
    private provider: ModelProviderInterface;

    constructor(provider: ModelProviderInterface = new StubbedModelProvider()) {
        this.provider = provider;
    }

    /**
     * Orchestrates the intelligence phase: Routes -> Plans -> Proposes.
     * Submits the final proposals to the governance layers.
     * 
     * SAFETY INVARIANT: Layer 7 semantic inspection MUST pass before any
     * task decomposition or model invocation proceeds.
     */
    async coordinateObjective(objective: string, tenantId: string): Promise<CoordinationResult> {
        // ═══ LAYER 7 GATE (FAIL-CLOSED) ═══
        // This MUST be the first operation. No objective reaches the planner
        // or model provider without passing semantic inspection.
        const inspection = await SemanticInspector.aggregate(objective);
        if (inspection.verdict === 'DENIED' || inspection.verdict === 'REQUIRES_HUMAN_QUORUM') {
            throw new Error(
                `[GOVERNANCE_BLOCKED] Objective rejected by Layer 7 inspection. ` +
                `Verdict: ${inspection.verdict}. ` +
                `Failures: ${inspection.deterministicFailures.join(', ')}. ` +
                `Heuristic score: ${inspection.heuristicScore}`
            );
        }

        // 1. Evaluate Complexity & Route
        const route = ComplexityRouter.routeObjective(objective);
        console.log(`[AGENT_COORDINATOR] Routed objective to ${route.assignedTier}`);

        // 2. Decompose into Plan
        const plan = DecompositionPlanner.createPlan(objective, tenantId);
        console.log(`[AGENT_COORDINATOR] Decomposed into ${plan.steps.length} execution steps.`);

        // 3. For a real system, the provider would be invoked per step here to generate exact payload parameters.
        // For Phase C, the decomposition planner provides the stubbed proposals directly.

        return {
            objective,
            routeAttestation: route,
            plan,
            status: 'PLANNED_AND_READY_FOR_GOVERNANCE'
        };
    }
}


import type { TaskPlan } from './task-planner.js';
import { ComplexityRouter } from './complexity-router.js';
import type { RouteAttestation } from './complexity-router.js';
import { AgnosticMultiProvider } from './model-provider.js';
import type { ModelProviderInterface } from './model-provider.js';
import { SemanticInspector } from '../inspection/semantic-pipeline.js';
import { emitGateTelemetry } from '../telemetry/governance-telemetry.js';

export interface CoordinationResult {
    objective: string;
    routeAttestation: RouteAttestation;
    plan: TaskPlan;
    status: 'PLANNED_AND_READY_FOR_GOVERNANCE';
}

export class AgentCoordinator {
    private provider: ModelProviderInterface;

    constructor(provider: ModelProviderInterface = new AgnosticMultiProvider()) {
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
        const inspectT0 = performance.now();
        const inspection = await SemanticInspector.aggregate(objective);
        const inspectLatency = Math.round(performance.now() - inspectT0);

        emitGateTelemetry({
            layer: 'SemanticInspector',
            verdict: inspection.verdict === 'DENIED' || inspection.verdict === 'REQUIRES_HUMAN_QUORUM' ? 'DENY' : 'PASS',
            latencyMs: inspectLatency,
            details: {
                verdict: inspection.verdict,
                heuristicScore: inspection.heuristicScore,
                deterministicFailures: inspection.deterministicFailures
            },
            timestamp: new Date().toISOString()
        });

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
        console.log(`[AGENT_COORDINATOR] Routed objective to tier=${route.assignedTier} provider=${route.resolvedProvider}`);

        emitGateTelemetry({
            layer: 'ComplexityRouter',
            verdict: 'PASS',
            latencyMs: 0,
            details: {
                assignedTier: route.assignedTier,
                resolvedProvider: route.resolvedProvider,
                reason: route.reason
            },
            timestamp: new Date().toISOString()
        });

        // 2. Decompose into Plan via Live LLM Generation
        console.log(`[AGENT_COORDINATOR] Invoking ModelProvider to generate real execution steps...`);
        const proposals = await this.provider.generateProposals(objective, tenantId, route.assignedTier);
        
        // Assemble real generated plan
        const plan = {
            objective,
            steps: proposals.map((p, index) => ({
                id: p.id || `step-${index + 1}`,
                toolName: p.toolName,
                tenantId: p.tenantId,
                payload: p.payload,
                dependencies: p.dependencies || (index > 0 ? [`step-${index}`] : [])
            }))
        };
        
        console.log(`[AGENT_COORDINATOR] Decomposed into ${plan.steps.length} true execution steps.`);

        return {
            objective,
            routeAttestation: route,
            plan,
            status: 'PLANNED_AND_READY_FOR_GOVERNANCE'
        };
    }
}


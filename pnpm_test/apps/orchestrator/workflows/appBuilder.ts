import { proxyActivities, patched } from '@temporalio/workflow';
import { 
    BrainPlan, 
    BrainTask, 
    JobArtifact, 
    ValidationResult, 
    AgentResponse 
} from '@shared-types/agent-contracts';

// Activities proxy
const { 
    callPlanner,
    callFrontend, 
    callBackend, 
    callDatabase,
    callSecurity,
    validateArtifacts,
    persistFiles,
    callDebugger,
    callCritic,
    callJudge,
    getBrainPlan
} = proxyActivities({
    startToCloseTimeout: '10 minutes',
    retry: {
        initialInterval: '5s',
        maximumAttempts: 3,
        backoffCoefficient: 2,
    }
});

/**
 * Intelligent App Builder Workflow
 * Driven by the AI Engineer Brain (DAG Execution)
 */
export async function appBuilderWorkflow(params: { prompt: string, userId: string, projectId: string, executionId: string, tenantId: string }): Promise<unknown> {
    const { prompt, projectId, executionId, tenantId } = params;

    // 1. Brain Reasoning Phase (Dynamic Planning)
    const plan: BrainPlan = await getBrainPlan(prompt, tenantId);
    
    // 2. Resolve DAG Execution Groups
    // Use dynamic import for deterministic resolver
    const { TaskGraph } = await import('@libs/brain/task-graph');
    const stages: BrainTask[][] = TaskGraph.resolveExecutionOrder(plan);

    let allArtifacts: JobArtifact[] = [];

    // 3. Dynamic Execution of Stages
    for (const stage of stages) {
        const stageResults: AgentResponse[] = await Promise.all(stage.map(async (task) => {
            // Map task agent to activity
            if (task.agent === 'frontend') return callFrontend(plan, tenantId);
            if (task.agent === 'backend') return callBackend(plan, tenantId);
            if (task.agent === 'database') return callDatabase(plan, tenantId);
            if (task.agent === 'planner') return callPlanner(prompt, tenantId);
            if (task.agent === 'security') return callSecurity(allArtifacts, tenantId);
            return { success: true, artifacts: [] }; // Unknown agent fallback
        }));

        // Merge artifacts from this stage
        for (const res of stageResults) {
            if (res.success && res.artifacts) {
                allArtifacts = [...allArtifacts, ...res.artifacts];
            }
        }
        
        // Intermediate persistence to keep the user updated
        await persistFiles(allArtifacts);
    }

    // 4. Self-Healing Loop (Principal Guardrails)
    let isValid = false;
    let attempts = 0;
    const MAX_RETRIES = 3;
    let lastError: string | null = null;

    // Local deterministic validation (Workflow safe)
    const validatePatch = (patch: JobArtifact) => {
        const forbidden = ['rm -rf', 'process.exit', 'fs.unlink', 'child_process.exec', 'eval('];
        if (patch.content.length > 5000) throw new Error('Patch too large (hallucination)');
        for (const p of forbidden) {
            if (patch.content.includes(p)) throw new Error(`Security violation: ${p}`);
        }
    };

    while (!isValid && attempts < MAX_RETRIES) {
        attempts++;
        
        try {
            const validation: ValidationResult = await validateArtifacts(allArtifacts);
            isValid = validation.valid;

            if (!isValid) {
                const errorMsg = validation.errors ? validation.errors.join('|').toLowerCase() : 'unknown_error';
                
                // 🚫 Stop if same error repeats
                if (errorMsg === lastError) {
                    throw new Error(`Self-healing stalled: Continuous failure with same error pattern: ${errorMsg}`);
                }
                lastError = errorMsg;

                if (attempts >= MAX_RETRIES) {
                    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${errorMsg}`);
                }

                const debugRes: AgentResponse = await callDebugger(errorMsg, allArtifacts, tenantId);
                if (debugRes.success && debugRes.artifacts?.length) {
                    const patches = debugRes.artifacts;
                    for (const patch of patches) {
                        // 🔒 Security Guardrail
                        validatePatch(patch);

                        const idx = allArtifacts.findIndex(a => a.path === patch.path);
                        if (idx > -1) allArtifacts[idx] = patch;
                        else allArtifacts.push(patch);
                    }
                    await persistFiles(allArtifacts);
                }
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            // Rethrow critical workflow failures
            if (attempts >= MAX_RETRIES || errorMsg.includes('Security')) {
                throw err;
            }
        }
    }

    // 5. Critic & Judge Review
    if (patched('v2-ai-judge')) {
        await callJudge(allArtifacts, prompt, tenantId);
    }

    await callCritic(allArtifacts, prompt, tenantId);

    return {
        status: isValid ? 'completed' : 'partially_completed',
        projectId,
        executionId,
        previewUrl: `https://preview-${executionId.slice(0, 8)}.multiagent.app`
    };
}

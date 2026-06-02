import 'dotenv/config';
import { AgentCoordinator } from '../packages/governance-core/src/intelligence/agent-coordinator.js';
import { GovernanceEngine } from '../packages/validator/src/index.js';
import { db } from '../packages/db/src/index.js';

// Setup Mock DB & INTERNAL_SERVICE_TOKEN
process.env.INTERNAL_SERVICE_TOKEN = 'mock-internal-token-for-opa';
process.env.LLM_PROVIDER = 'groq';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || ''; // Set via .env file
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:54322/postgres';

async function runTrace() {
    console.log('=== Priority 1: Full Governance Chain Trace ===');
    
    // 1. Send Objective through AgentCoordinator
    console.log('\n--- 1. Agent Coordinator & LiveModelProvider ---');
    const objective = 'Analyze the database and apply recommended indexing improvements.';
    const tenantId = 'platform-admin';
    const coordinator = new AgentCoordinator();
    
    let result;
    try {
        result = await coordinator.coordinateObjective(objective, tenantId);
        console.log('[Trace] Coordinator Result:', JSON.stringify(result.plan, null, 2));
    } catch (err) {
        console.error('[Trace] Coordinator Failed:', err);
        return;
    }

    // 2. Persist the generated proposal as if we are the Worker
    console.log('\n--- 2. Simulating Queue & DB Persistence ---');
    
    // Using the first generated step as our target for execution
    const primaryStep = result.plan.steps[0];
    
    // Manually push to the mock Prisma DB
    const proposal = await db.proposedChange.create({
        data: {
            agentId: 'drill-1-agent',
            targetPath: primaryStep.toolName,
            changeType: 'db_optimization',
            reason: result.plan.objective,
            patch: JSON.stringify(primaryStep.payload),
            status: 'proposed'
        }
    });
    console.log('[Trace] Proposal persisted with ID:', proposal.id);

    // Register system_modification in PermissionEngine so StaticCommandFilter passes
    const { PermissionEngine } = await import('../packages/governance-core/src/permissions/lattice.js');
    PermissionEngine.registerLattice({
        toolName: 'system_modification',
        tenantScope: ['*'],
        filesystemScope: ['*'],
        networkScope: ['*'],
        runtimeMode: 'sandbox',
        approvalRequirement: true,
        payloadLimits: { maxSizeBytes: 1000000 },
        executionTimeLimitsMs: 10000,
        allowedFileTypes: ['*'],
        environmentBoundaries: ['*']
    });

    const { SideEffectOntology, SideEffectClass } = await import('../packages/governance-core/src/ontology/side-effects.js');
    SideEffectOntology.registerOperation({
        name: 'system_modification',
        sideEffectClass: SideEffectClass.APPROVAL_REQUIRED,
        description: 'Dynamically generated system modification proposal'
    });

    // 3. Evaluate through the Governance Engine
    console.log('\n--- 3. Governance Engine (SelfModificationWorker) ---');
    const evaluation = await GovernanceEngine.evaluateProposal(proposal.id);
    
    console.log('[Trace] Governance Evaluation Result:', evaluation);
    
    if (evaluation.allowed) {
        console.log('[Trace] Output: EXECUTION_APPROVED - Forwarding to Sandbox');
    } else {
        console.log('[Trace] Output: EXECUTION_DENIED - Blocked by:', evaluation.reason);
    }
}

runTrace().catch(console.error);

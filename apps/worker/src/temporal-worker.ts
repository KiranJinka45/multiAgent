// @ts-nocheck
import { Worker } from '@temporalio/worker';
import { createActivities } from '@packages/utils';
import path from 'path';

// --- AGENT REGISTRATION ---
import { 
    agentRegistry,
    DatabaseAgent,
    BackendAgent,
    FrontendAgent,
    DeploymentAgent,
    SecurityAgent,
    MonitoringAgent,
    SaaSMonetizationAgent,
    PlannerAgent,
    ResearchAgent,
    DebugAgent,
    ArchitectureAgent,
    RankingAgent,
    RepairAgent,
    CriticAgent
} from '@packages/utils';

// Register with standardized lowercase keys
agentRegistry.register('database', new DatabaseAgent());
agentRegistry.register('backend', new BackendAgent());
agentRegistry.register('frontend', new FrontendAgent());
agentRegistry.register('deploy', new DeploymentAgent());
agentRegistry.register('security', new SecurityAgent());
agentRegistry.register('monitoring', new MonitoringAgent());
agentRegistry.register('billing', new SaaSMonetizationAgent());
agentRegistry.register('planner', new PlannerAgent());
agentRegistry.register('research', new ResearchAgent());
agentRegistry.register('debug', new DebugAgent());
agentRegistry.register('architecture', new ArchitectureAgent());
agentRegistry.register('ranking', new RankingAgent());
agentRegistry.register('repair', new RepairAgent());
// CriticAgent doesn't match TaskAgent exactly due to its unique execute signature. 
// We cast it to any and we will potentially refactor it later if needed for full type safety.
agentRegistry.register('critic', new CriticAgent() as any); 

async function run() {
    console.log('[TemporalWorker] Starting distributed agent worker...');

    const worker = await Worker.create({
        workflowsPath: path.resolve(__dirname, '../orchestrator/workflows'),
        activities: createActivities('system-worker'),
        taskQueue: 'app-builder',
    });

    await worker.run();
}

run().catch((err) => {
    console.error('[TemporalWorker] Fatal error:', err);
    process.exit(1);
});



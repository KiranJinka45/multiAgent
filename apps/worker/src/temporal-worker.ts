import { Worker } from '@temporalio/worker';
import * as activities from '../orchestrator/activities/agentActivities';
import path from 'path';

// --- AGENT REGISTRATION ---
import { agentRegistry } from '@libs/utils';
import { DatabaseAgent } from '@libs/agents';
import { BackendAgent } from '@libs/agents';
import { FrontendAgent } from '@libs/agents';
import { DeploymentAgent } from '@libs/agents';
import { SecurityAgent } from '@libs/agents';
import { MonitoringAgent } from '@libs/agents';
import { SaaSMonetizationAgent } from '@libs/agents';
import { PlannerAgent } from '@libs/agents';
import { ResearchAgent } from '@libs/agents';
import { DebugAgent } from '@libs/agents';
import { ArchitectureAgent } from '@libs/agents';
import { RankingAgent } from '@libs/agents';
import { RepairAgent } from '@libs/agents';
import { CriticAgent } from '@libs/agents';

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
        activities: activities.createActivities('system-worker'),
        taskQueue: 'app-builder',
    });

    await worker.run();
}

run().catch((err) => {
    console.error('[TemporalWorker] Fatal error:', err);
    process.exit(1);
});

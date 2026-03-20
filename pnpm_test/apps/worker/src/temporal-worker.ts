import { Worker } from '@temporalio/worker';
import * as activities from '../orchestrator/activities/agentActivities';
import path from 'path';

// --- AGENT REGISTRATION ---
import { agentRegistry } from '@services/agent-registry';
import { DatabaseAgent } from '@agents/database-agent';
import { BackendAgent } from '@agents/backend-agent';
import { FrontendAgent } from '@agents/frontend-agent';
import { DeploymentAgent } from '@agents/deploy-agent';
import { SecurityAgent } from '@agents/security-agent';
import { MonitoringAgent } from '@agents/monitoring-agent';
import { SaaSMonetizationAgent } from '@agents/saas-monetization-agent';
import { PlannerAgent } from '@agents/planner-agent';
import { ResearchAgent } from '@agents/research-agent';
import { DebugAgent } from '@agents/debug-agent';
import { ArchitectureAgent } from '@agents/architecture-agent';
import { RankingAgent } from '@agents/ranking-agent';
import { RepairAgent } from '@agents/repair-agent';
import { CriticAgent } from '@agents/critic-agent';

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

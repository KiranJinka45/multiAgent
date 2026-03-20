import * as workflow from '@temporalio/workflow';

// Define the activities interface for type safety in proxy
export interface AgentActivities {
  callPlanner(prompt: string, tenantId: string): Promise<any>;
  callFrontend(plan: any, tenantId: string): Promise<any>;
  callBackend(plan: any, tenantId: string): Promise<any>;
  callDatabase(plan: any, tenantId: string): Promise<any>;
  callDebugger(errors: string, artifacts: any[], tenantId: string): Promise<any>;
  callCritic(artifacts: any[], prompt: string, tenantId: string): Promise<any>;
  persistFiles(files: any[]): Promise<void>;
  deployPreview(): Promise<string>;
}

const { callPlanner, callFrontend, callBackend, callDatabase, callDebugger, callCritic, persistFiles, deployPreview } = 
  workflow.proxyActivities<AgentActivities>({
    startToCloseTimeout: '10 minutes',
  });

/**
 * Autonomous AI Coding Workflow: Self-healing app generator
 */
export async function autonomousBuild(prompt: string, tenantId: string = 'default'): Promise<string> {
  // 1. Plan the build
  const planResponse = await callPlanner(prompt, tenantId);
  const plan = planResponse.data.plan;
  console.log(`[AutoBuilder] Plan generated: ${plan.reasoning.slice(0, 50)}...`);

  // 2. Execute tasks
  const dbRes = await callDatabase(plan, tenantId);
  const beRes = await callBackend(plan, tenantId);
  const feRes = await callFrontend(plan, tenantId);

  // 3. Persist and Evaluate
  const artifacts = [...(dbRes.data.files || []), ...(beRes.data.files || []), ...(feRes.data.files || [])];
  await persistFiles(artifacts);
  
  const critique = await callCritic(artifacts, prompt, tenantId);
  if (critique.data.score < 0.7) {
    // Attempt debugging
    const debugRes = await callDebugger("Quality below threshold", artifacts, tenantId);
    console.log(`[AutoBuilder] Debugging result: ${debugRes.data.rootCause}`);
    // Simplified: in real app, we would loop back to regenerate
  }

  // 4. Deploy Final Preview
  return await deployPreview();
}

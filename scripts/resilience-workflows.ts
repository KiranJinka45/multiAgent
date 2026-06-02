import * as workflow from '@temporalio/workflow';
import type * as activities from './resilience-activities.js';

const { writeBlockActivity } = workflow.proxyActivities<typeof activities>({
  startToCloseTimeout: '10s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 1.0, // Retries every second for quick test cycles
    maximumInterval: '2s'
  }
});

export async function databaseResilienceWorkflow(payload: string): Promise<string> {
  console.log('[Workflow] Executing databaseResilienceWorkflow...');
  const result = await writeBlockActivity(payload);
  console.log(`[Workflow] Completed. Result block: ${result}`);
  return result;
}

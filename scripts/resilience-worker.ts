import { Worker } from '@temporalio/worker';
import * as activities from './resilience-activities.js';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Set database connection URL
  process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:54399/multiagent?schema=public';

  const workflowsPath = path.join(__dirname, 'resilience-workflows.ts');
  console.log('[Worker] Initializing resilience worker...');
  
  const worker = await Worker.create({
    workflowsPath,
    activities,
    taskQueue: 'resilience-tasks',
  });

  console.log('[Worker] Worker started, listening on task queue: resilience-tasks');
  await worker.run();
}

main().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});

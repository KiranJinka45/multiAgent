import { Worker } from '@temporalio/worker';
import { logger } from '@packages/observability';
import * as activities from './activities';
import path from 'path';
// In CommonJS, __filename and __dirname are available globally.
// This file is built to CJS because it is part of the worker fleet.

/**
 * Initializes and starts the Temporal Worker for the app-builder task queue.
 */
export async function startTemporalWorker() {
  try {
    const worker = await Worker.create({
      workflowsPath: path.resolve(__dirname, '../../../../packages/contracts/src/workflows/build-workflow.ts'),
      activities,
      taskQueue: 'app-builder',
      // In production, we'd add more configuration here (e.g., namespace, connection)
    });

    logger.info('[Temporal] Worker initialized on task queue: app-builder');
    
    // Start polling for tasks
    await worker.run();
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '[Temporal] Worker failed to start');
    // In a distributed system, we might want to crash here to let K8s restart
    throw err;
  }
}

// Start worker immediately when this file is imported (if not in test mode)
if (process.env.NODE_ENV !== 'test') {
    startTemporalWorker().catch(err => {
        logger.error({ err }, '[Temporal] Auto-start failed');
    });
}


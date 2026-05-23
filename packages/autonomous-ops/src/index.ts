import { logger } from '@packages/observability';

export * from './engine.js';
export * from './types.js';
export * from './drivers/kubernetes.js';
export * from './drivers/terraform.js';

export async function setupAutonomousWorker() {
    logger.info('[Autonomous-Ops] Setting up autonomous worker...');
}

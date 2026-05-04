import { BaseWorker } from './base-worker';
import { Job } from '@packages/utils';
import { JobPayload } from '@packages/utils';
/**
 * BackendWorker
 *
 * Specialized agent for:
 * 1. Generating API specifications (OpenAPI)
 * 2. Implementing server-side logic (Node.js/FastAPI)
 * 3. Database schema design and migrations
 */
export declare class BackendWorker extends BaseWorker {
    constructor();
    protected queueName: string;
    getName(): string;
    getWorkerId(): string;
    protected processJob(job: Job<JobPayload>): Promise<unknown>;
}

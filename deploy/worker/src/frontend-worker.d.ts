import { BaseWorker } from './base-worker';
import { Job } from '@packages/utils';
import { JobPayload } from '@packages/utils';
/**
 * FrontendWorker
 *
 * Specialized agent for:
 * 1. React/Next.js component generation
 * 2. UI/UX styling (CSS/Tailwind)
 * 3. Client-side state management
 */
export declare class FrontendWorker extends BaseWorker {
    constructor();
    protected queueName: string;
    getName(): string;
    getWorkerId(): string;
    protected processJob(job: Job<JobPayload>): Promise<unknown>;
}

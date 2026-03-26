import { BaseWorker } from './base-worker';
import { Job } from 'bullmq';
import { JobPayload } from '@libs/utils';
import { logger } from '@libs/observability';
import { eventBus } from '@libs/shared-services';
import { AgentMemory } from '@libs/agents/services/agent-memory';

/**
 * BackendWorker
 * 
 * Specialized agent for:
 * 1. Generating API specifications (OpenAPI)
 * 2. Implementing server-side logic (Node.js/FastAPI)
 * 3. Database schema design and migrations
 */
export class BackendWorker extends BaseWorker {
    constructor() {
        super('backend_queue');
    }

    protected queueName = 'backend_queue';

    getName() { return 'BackendAgent'; }
    getWorkerId() { return `backend-worker-${process.pid}`; }

    protected async processJob(job: Job<JobPayload>): Promise<unknown> {
        const { missionId, taskId } = job.data;
        
        try {
            logger.info({ missionId, taskId }, '[BackendWorker] Starting task');
        await this.streamThought(missionId, "Analyzing backend requirements and designing API routes...");

        // Simulate logic generation
        await new Promise(resolve => setTimeout(resolve, 3000));

        const result = {
            files: [
                { path: 'server/api/routes.ts', content: '// Generated Express routes\nexport const routes = [];' },
                { path: 'server/models/schema.ts', content: '// Generated DB Schema' }
            ],
            metrics: {
                tokens: 1200,
                duration: 3000
            }
        };

        // Persist to Agent Memory
        await AgentMemory.set(missionId, `backend:result:${taskId}`, result);
        await AgentMemory.appendTranscript(missionId, this.getName(), "Successfully generated API routes and schema.");

        await eventBus.stage(missionId, this.getName(), 'COMPLETED', `Generated ${result.files.length} backend files`, 100);

        return result;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, missionId, taskId }, '[BackendWorker] Task failed');
        await eventBus.error(missionId, `Backend Error: ${errorMessage}`);
        throw error;
    }
    }
}

// Start worker if executed directly
if (require.main === module) {
    new BackendWorker();
}

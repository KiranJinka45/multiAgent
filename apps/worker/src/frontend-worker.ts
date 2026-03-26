import { BaseWorker } from './base-worker';
import { Job } from 'bullmq';
import { JobPayload } from '@libs/utils';
import { logger } from '@libs/observability';
import { eventBus } from '@libs/shared-services';
import { AgentMemory } from '@libs/agents/services/agent-memory';

/**
 * FrontendWorker
 * 
 * Specialized agent for:
 * 1. React/Next.js component generation
 * 2. UI/UX styling (CSS/Tailwind)
 * 3. Client-side state management
 */
export class FrontendWorker extends BaseWorker {
    constructor() {
        super('frontend_queue');
    }

    protected queueName = 'frontend_queue';

    getName() { return 'FrontendAgent'; }
    getWorkerId() { return `frontend-worker-${process.pid}`; }

    protected async processJob(job: Job<JobPayload>): Promise<unknown> {
        const { missionId, taskId } = job.data;
        
        try {
            logger.info({ missionId, taskId }, '[FrontendWorker] Starting task');
        await this.streamThought(missionId, "Designing UI components and responsive layouts...");

        // Simulate UI generation
        await new Promise(resolve => setTimeout(resolve, 4000));

        const result = {
            files: [
                { path: 'src/components/Dashboard.tsx', content: 'export const Dashboard = () => <div>Aion Dashboard</div>;' },
                { path: 'src/styles/globals.css', content: '/* Generated Styles */' }
            ],
            metrics: {
                tokens: 1500,
                duration: 4000
            }
        };

        await AgentMemory.set(missionId, `frontend:result:${taskId}`, result);
        await AgentMemory.appendTranscript(missionId, this.getName(), "Generated fundamental UI components and styles.");

        return result;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, missionId, taskId }, '[FrontendWorker] Task failed');
        await eventBus.error(missionId, `Frontend Error: ${errorMessage}`);
        throw error;
    }
    }
}

if (require.main === module) {
    new FrontendWorker();
}

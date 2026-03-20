import { BaseWorker } from './base-worker';
import { Job } from 'bullmq';
import { JobPayload } from '../shared/types';
import logger from '../shared/logger';
import { AgentMemory } from '../shared/services/agent-memory';

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

    protected async processJob(job: Job<JobPayload>): Promise<any> {
        const { missionId, taskId, payload } = job.data;
        
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
    }
}

if (require.main === module) {
    new FrontendWorker();
}

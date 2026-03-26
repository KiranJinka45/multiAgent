import { BaseWorker } from './base-worker';
import { Job } from 'bullmq';
import { JobPayload } from '../shared/types';
import logger from '@libs/observability';
import { eventBus } from '../shared/services/event-bus';

/**
 * ArchitectWorker
 * 
 * responsible for:
 * 1. Technical planning
 * 2. Creating the TaskGraph
 * 3. Initializing the build mission
 */
export class ArchitectWorker extends BaseWorker {
    constructor() {
        super('architect_queue');
    }

    protected queueName = 'architect_queue';

    getName() { return 'ArchitectAgent'; }
    getWorkerId() { return `architect-${process.pid}`; }

    protected async processJob(job: Job<JobPayload>) {
        const { missionId, payload } = job.data;
        logger.info({ missionId }, '[ArchitectWorker] Processing technical blueprint...');

        await this.streamThought(missionId, 'Analyzing user prompt and designing system architecture...');
        await eventBus.stage(missionId, 'planning', 'in_progress', 'Architect generating technical blueprint...', 20);

        // Simulate blueprint generation
        const blueprint = {
            projectType: 'Next.js',
            features: ['Auth', 'Database', 'API'],
            tasks: [
                { id: 't1', type: 'scaffold', title: 'Scaffold Project' },
                { id: 't2', type: 'frontend', title: 'Build UI Components', dependsOn: ['t1'] }
            ]
        };

        await this.streamThought(missionId, 'Blueprint generated successfully.');
        
        return { success: true, blueprint };
    }
}

// Start worker if executed directly
if (require.main === module) {
    new ArchitectWorker();
}

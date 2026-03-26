import { Worker, Job } from 'bullmq';
import logger from '@libs/observability';
import { eventBus } from '../shared/services/event-bus';
import redis from '../shared/services/redis';

/**
 * BaseWorker
 * 
 * Standardized worker for all AI agents.
 * 1. BullMQ integration
 * 2. Deterministic heartbeats
 * 3. Unified logging and event streaming
 */
export abstract class BaseWorker {
    protected worker: Worker;
    protected abstract queueName: string;

    constructor(queueName: string) {
        this.worker = new Worker(queueName, async (job) => {
            return this.processJob(job);
        }, { connection: redis as any });

        this.startHeartbeat();
    }

    private startHeartbeat() {
        setInterval(async () => {
            const workerId = this.getWorkerId();
            // Use redis as any to avoid type mismatch in standard ioredis vs bullmq ioredis
            await (redis as any).setex(`worker:heartbeat:${workerId}`, 30, JSON.stringify({
                status: 'active',
                timestamp: Date.now(),
                workerType: this.getName()
            }));
        }, 10000);
    }

    protected abstract processJob(job: Job): Promise<any>;

    protected async streamThought(missionId: string, thought: string) {
        await eventBus.thought(missionId, this.getName(), thought);
    }

    abstract getName(): string;
    abstract getWorkerId(): string;
}

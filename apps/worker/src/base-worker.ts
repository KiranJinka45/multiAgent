import { Worker, Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@packages/observability';
import { redis, eventBus } from '@packages/shared-services';
import { 
    DistributedExecutionContext, 
    usageService, 
    TenantService, 
    SLOService 
} from '@packages/utils/server';
import { DEFAULT_RETRY_OPTIONS, DEAD_LETTER_QUEUE_NAME, createBreaker } from '@packages/resilience';

// Mock metrics for now if they are not in @packages/utils/server or use a generic one
const workerTaskDurationSeconds = { observe: (...args: any[]) => {} };
const agentFailuresTotal = { inc: (...args: any[]) => {} };

/**
 * BaseWorker
 * 
 * Standardized worker for all AI agents.
 */
export abstract class BaseWorker {
    protected worker: Worker;
    protected dlq: Queue;
    protected breaker: any;

    constructor(queueName: string) {
        this.breaker = createBreaker(async (job: Job) => {
            return this.processJob(job);
        }, {
            timeout: 30000,
            errorThresholdPercentage: 50,
            resetTimeout: 10000,
        });

        this.worker = new Worker(queueName, async (job: Job) => {
            if (!job.id) return this.breaker.fire(job);
            
            const tenantId = job.data.tenantId || 'global';
            const hasQuota = await TenantService.checkQuota(tenantId);
            
            if (!hasQuota) {
                logger.error({ tenantId, jobId: job.id }, '[Worker] Tenant quota exceeded');
                throw new Error(`QUOTA_EXCEEDED: ${tenantId}`);
            }

            const startTime = Date.now();
            let status = 'success';
            try {
                const result = await this.breaker.fire(job);
                
                if (result && typeof result === 'object' && 'metrics' in result) {
                    const metrics = (result as any).metrics;
                    await usageService.recordAiUsage({
                        model: (result as any).model || 'default',
                        promptTokens: metrics.promptTokens || 0,
                        completionTokens: metrics.completionTokens || 0,
                        totalTokens: metrics.totalTokens || 0,
                        userId: job.data.userId || 'system',
                        tenantId: job.data.tenantId || 'global',
                        metadata: { jobId: job.id, queue: queueName }
                    });
                }

                return result;
            } catch (err) {
                status = 'failed';
                agentFailuresTotal.inc({ agent_name: this.getName() });
                throw err;
            } finally {
                const duration = (Date.now() - startTime) / 1000;
                workerTaskDurationSeconds.observe({ queue_name: queueName, status }, duration);
                SLOService.checkLatency(queueName, duration);
            }
        }, { 
            connection: redis as unknown as Redis,
            ...DEFAULT_RETRY_OPTIONS
        });

        this.dlq = new Queue(DEAD_LETTER_QUEUE_NAME, { connection: redis as unknown as Redis });

        this.worker.on('failed', async (job: Job | undefined, err: Error) => {
            if (job && job.attemptsMade >= (DEFAULT_RETRY_OPTIONS.attempts || 3)) {
                await this.dlq.add('failed-job', {
                    originalQueue: queueName,
                    jobId: job.id,
                    data: job.data,
                    error: err.message
                });
            }
        });
    }

    protected abstract processJob(job: Job): Promise<unknown>;
    abstract getName(): string;
    abstract getWorkerId(): string;
}

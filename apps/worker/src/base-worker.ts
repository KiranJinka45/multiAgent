// @ts-nocheck
import { Worker, Job, Queue } from '@packages/utils';
import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { eventBus } from '@packages/utils';
import { 
    DistributedExecutionContext, 
    usageService, 
    TenantService, 
    SLOService,
    contextStorage,
    BaseExecutionError
} from '@packages/utils';
import { DEFAULT_RETRY_OPTIONS, DEAD_LETTER_QUEUE_NAME, createBreaker } from '@packages/resilience';
import crypto from 'crypto';

// Mock metrics for now if they are not in @packages/utils or use a generic one
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
        if (!queueName) throw new Error("FATAL: Queue name must be provided to BaseWorker");

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
            const userId = job.data.userId || 'system';

            // Propagate context to all downstream operations (DB, logs, etc.)
            return contextStorage.run({
                requestId: `job-${job.id}`,
                userId,
                tenantId
            }, async () => {
                const hasQuota = await TenantService.checkQuota(tenantId);
                
                if (!hasQuota) {
                    logger.error({ tenantId, jobId: job.id }, '[Worker] Tenant quota exceeded');
                    throw new Error(`QUOTA_EXCEEDED: ${tenantId}`);
                }

                const startTime = Date.now();
                let status = 'success';

                const tracer = DistributedExecutionContext.getTracer();
                return tracer.startActiveSpan(`agent:${this.getName()}:process`, async (span) => {
                    span.setAttribute('job.id', job.id);
                    span.setAttribute('tenant.id', tenantId);
                    span.setAttribute('agent.name', this.getName());
                    
                    try {
                        logger.info({ 
                            worker: this.getName(), 
                            jobId: job.id, 
                            queue: queueName 
                        }, '🏁 [Worker] Job started');
                        
                        const result = await this.breaker.fire(job);
                        
                        logger.info({ 
                            worker: this.getName(), 
                            jobId: job.id, 
                            status: 'success' 
                        }, '✅ [Worker] Job completed');

                        if (result && typeof result === 'object' && 'metrics' in result) {
                            const metrics = (result as any).metrics;
                            span.setAttribute('agent.model', (result as any).model || 'default');
                            span.setAttribute('agent.tokens.prompt', metrics.promptTokens || 0);
                            span.setAttribute('agent.tokens.completion', metrics.completionTokens || 0);
                            span.setAttribute('agent.tokens.total', metrics.totalTokens || 0);

                            await usageService.recordAiUsage({
                                model: (result as any).model || 'default',
                                promptTokens: metrics.promptTokens || 0,
                                completionTokens: metrics.completionTokens || 0,
                                totalTokens: metrics.totalTokens || 0,
                                userId,
                                tenantId,
                                metadata: { jobId: job.id, queue: queueName }
                            });
                        }

                        span.setStatus({ code: 1 }); // OK
                        return result;
                    } catch (err: any) {
                        status = 'failed';
                        agentFailuresTotal.inc({ agent_name: this.getName() });
                        span.setStatus({ code: 2, message: err.message }); // Error
                        span.recordException(err);

                        // 1. Immediate DLQ containment for custom failure actions
                        if (err && (err.action === 'dlq' || err.action === 'quarantine')) {
                            logger.warn({ jobId: job.id, action: err.action }, '📥 [Worker] Failure Taxonomy Bypass: Immediate Dead Letter Queue (DLQ) routing.');
                            await this.dlq.add('failed-job', {
                                originalQueue: queueName,
                                jobId: job.id,
                                data: job.data,
                                error: `[Bypass: ${err.name}] ${err.message}`,
                                failedAt: new Date().toISOString()
                            });
                            return { status: 'dlq_bypassed', error: err.message };
                        }

                        // 2. Exception Fingerprinting for Poison Job Detection
                        const exceptionMessage = err.message || '';
                        const exceptionStack = err.stack || '';
                        const failureFingerprint = crypto.createHash('sha256')
                            .update(exceptionMessage + exceptionStack)
                            .digest('hex');
                        
                        const fingerprintKey = `worker:poison:fingerprint:${job.id}`;
                        const counterKey = `worker:poison:counter:${job.id}`;
                        
                        try {
                            const prevFingerprint = await redis.get(fingerprintKey);
                            if (prevFingerprint === failureFingerprint) {
                                const count = await redis.incr(counterKey);
                                if (count >= 2) {
                                    logger.error({ jobId: job.id, fingerprint: failureFingerprint }, '💥 [Worker] Poison Candidate Detected: Same crash occurred 2+ consecutive times. Immediate DLQ quarantining.');
                                    await this.dlq.add('failed-job', {
                                        originalQueue: queueName,
                                        jobId: job.id,
                                        data: job.data,
                                        error: `[Poison Pill] ${err.message}`,
                                        failedAt: new Date().toISOString()
                                    });
                                    // Clear keys
                                    await redis.del(fingerprintKey, counterKey);
                                    return { status: 'poison_quarantined', error: err.message };
                                }
                            } else {
                                await redis.set(fingerprintKey, failureFingerprint, 'EX', 3600);
                                await redis.set(counterKey, '1', 'EX', 3600);
                            }
                        } catch (cacheErr) {
                            logger.error({ err: cacheErr.message }, 'Failed to process poison job fingerprint check');
                        }

                        throw err;
                    } finally {
                        const duration = (Date.now() - startTime) / 1000;
                        workerTaskDurationSeconds.observe({ queue_name: queueName, status }, duration);
                        SLOService.checkLatency(queueName, duration);
                        span.end();
                    }
                });
            });
        }, { 
            connection: redis,
            ...DEFAULT_RETRY_OPTIONS
        });

        this.dlq = new Queue(DEAD_LETTER_QUEUE_NAME, { connection: redis });

        this.worker.on('failed', async (job: Job | undefined, err: Error) => {
            logger.error({ 
                worker: this.getName(), 
                jobId: job?.id, 
                err: err.message 
            }, '❌ [Worker] Job failed');

            if (job && job.attemptsMade >= (DEFAULT_RETRY_OPTIONS.attempts || 3)) {
                logger.warn({ 
                    worker: this.getName(), 
                    jobId: job.id 
                }, '📥 [Worker] Moving job to Dead Letter Queue');

                await this.dlq.add('failed-job', {
                    originalQueue: queueName,
                    jobId: job.id,
                    data: job.data,
                    error: err.message,
                    failedAt: new Date().toISOString()
                });
            }
        });

        this.worker.on('error', (err) => {
            logger.error({ 
                worker: this.getName(), 
                err 
            }, '🚨 [Worker] Internal BullMQ error');
        });

        this.worker.on('stalled', (jobId) => {
            logger.warn({ 
                worker: this.getName(), 
                jobId 
            }, '⏳ [Worker] Job stalled');
        });
    }

    protected abstract processJob(job: Job): Promise<unknown>;
    abstract getName(): string;
    abstract getWorkerId(): string;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const utils_3 = require("@packages/utils");
const resilience_1 = require("@packages/resilience");
// Mock metrics for now if they are not in @packages/utils or use a generic one
const workerTaskDurationSeconds = { observe: (...args) => { } };
const agentFailuresTotal = { inc: (...args) => { } };
/**
 * BaseWorker
 *
 * Standardized worker for all AI agents.
 */
class BaseWorker {
    worker;
    dlq;
    breaker;
    constructor(queueName) {
        if (!queueName)
            throw new Error("FATAL: Queue name must be provided to BaseWorker");
        this.breaker = (0, resilience_1.createBreaker)(async (job) => {
            return this.processJob(job);
        }, {
            timeout: 30000,
            errorThresholdPercentage: 50,
            resetTimeout: 10000,
        });
        this.worker = new utils_1.Worker(queueName, async (job) => {
            if (!job.id)
                return this.breaker.fire(job);
            const tenantId = job.data.tenantId || 'global';
            const hasQuota = await utils_3.TenantService.checkQuota(tenantId);
            if (!hasQuota) {
                observability_1.logger.error({ tenantId, jobId: job.id }, '[Worker] Tenant quota exceeded');
                throw new Error(`QUOTA_EXCEEDED: ${tenantId}`);
            }
            const startTime = Date.now();
            let status = 'success';
            // ── Agentic Tracing Capstone ───────────────────────────────────────────
            // This allows for deep observability into the reasoning loops of the AI agents.
            const tracer = utils_3.DistributedExecutionContext.getTracer();
            return tracer.startActiveSpan(`agent:${this.getName()}:process`, async (span) => {
                span.setAttribute('job.id', job.id);
                span.setAttribute('tenant.id', tenantId);
                span.setAttribute('agent.name', this.getName());
                try {
                    observability_1.logger.info({
                        worker: this.getName(),
                        jobId: job.id,
                        queue: queueName
                    }, '🏁 [Worker] Job started');
                    const result = await this.breaker.fire(job);
                    observability_1.logger.info({
                        worker: this.getName(),
                        jobId: job.id,
                        status: 'success'
                    }, '✅ [Worker] Job completed');
                    if (result && typeof result === 'object' && 'metrics' in result) {
                        const metrics = result.metrics;
                        span.setAttribute('agent.model', result.model || 'default');
                        span.setAttribute('agent.tokens.prompt', metrics.promptTokens || 0);
                        span.setAttribute('agent.tokens.completion', metrics.completionTokens || 0);
                        span.setAttribute('agent.tokens.total', metrics.totalTokens || 0);
                        await utils_3.usageService.recordAiUsage({
                            model: result.model || 'default',
                            promptTokens: metrics.promptTokens || 0,
                            completionTokens: metrics.completionTokens || 0,
                            totalTokens: metrics.totalTokens || 0,
                            userId: job.data.userId || 'system',
                            tenantId: job.data.tenantId || 'global',
                            metadata: { jobId: job.id, queue: queueName }
                        });
                    }
                    span.setStatus({ code: 1 }); // OK
                    return result;
                }
                catch (err) {
                    status = 'failed';
                    agentFailuresTotal.inc({ agent_name: this.getName() });
                    span.setStatus({ code: 2, message: err.message }); // Error
                    span.recordException(err);
                    throw err;
                }
                finally {
                    const duration = (Date.now() - startTime) / 1000;
                    workerTaskDurationSeconds.observe({ queue_name: queueName, status }, duration);
                    utils_3.SLOService.checkLatency(queueName, duration);
                    span.end();
                }
            });
        }, {
            connection: utils_2.redis,
            ...resilience_1.DEFAULT_RETRY_OPTIONS
        });
        this.dlq = new utils_1.Queue(resilience_1.DEAD_LETTER_QUEUE_NAME, { connection: utils_2.redis });
        this.worker.on('failed', async (job, err) => {
            observability_1.logger.error({
                worker: this.getName(),
                jobId: job?.id,
                err: err.message
            }, '❌ [Worker] Job failed');
            if (job && job.attemptsMade >= (resilience_1.DEFAULT_RETRY_OPTIONS.attempts || 3)) {
                observability_1.logger.warn({
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
            observability_1.logger.error({
                worker: this.getName(),
                err
            }, '🚨 [Worker] Internal BullMQ error');
        });
        this.worker.on('stalled', (jobId) => {
            observability_1.logger.warn({
                worker: this.getName(),
                jobId
            }, '⏳ [Worker] Job stalled');
        });
    }
}
exports.BaseWorker = BaseWorker;
//# sourceMappingURL=base-worker.js.map
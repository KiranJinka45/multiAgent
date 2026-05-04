"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerQueue = exports.buildQueue = exports.proQueue = exports.freeQueue = exports.createWorker = exports.QueueManager = exports.QUEUE_PRO = exports.QUEUE_FREE = exports.connection = void 0;
const bullmq_1 = require("bullmq");
const observability_1 = require("@packages/observability");
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
/**
 * DISTRIBUTED QUEUE AUTHORITY
 * Powered by BullMQ for reliable agent task orchestration.
 * Uses the shared Redis connection from @packages/utils.
 */
exports.connection = utils_1.redis;
// Exporting constants from utils for convenience and single source of truth
exports.QUEUE_FREE = utils_2.QUEUE_FREE;
exports.QUEUE_PRO = utils_2.QUEUE_PRO;
class QueueManager {
    queue;
    queueEvents;
    constructor(name) {
        this.queue = new bullmq_1.Queue(name, { connection: exports.connection });
        this.queueEvents = new bullmq_1.QueueEvents(name, { connection: exports.connection });
        this.queueEvents.on('failed', ({ jobId, failedReason }) => {
            observability_1.logger.error({ jobId, failedReason, queue: name }, 'Job failed in queue');
        });
    }
    async addJob(name, data, opts = {}) {
        const tenantId = data.tenantId || opts.tenantId;
        const job = await this.queue.add(name, {
            ...data,
            tenantId,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            // Grouping by tenantId for better isolation if the queue supports it
            ...(tenantId ? { jobId: `${tenantId}:${Date.now()}:${Math.random().toString(36).substring(7)}` } : {}),
            ...opts
        });
        return job;
    }
    async getStatus(jobId) {
        const job = await bullmq_1.Job.fromId(this.queue, jobId);
        return job ? await job.getState() : 'unknown';
    }
}
exports.QueueManager = QueueManager;
// Global process registry for Workers
const createWorker = (name, processor) => {
    return new bullmq_1.Worker(name, processor, { connection: exports.connection, concurrency: 10 });
};
exports.createWorker = createWorker;
// Default options for system reliability
const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
};
// Standard Queues used by the system
exports.freeQueue = new bullmq_1.Queue(exports.QUEUE_FREE, { connection: exports.connection, defaultJobOptions });
exports.proQueue = new bullmq_1.Queue(exports.QUEUE_PRO, { connection: exports.connection, defaultJobOptions });
// Compatibility Shims
exports.buildQueue = exports.freeQueue;
exports.plannerQueue = exports.freeQueue;
//# sourceMappingURL=index.js.map
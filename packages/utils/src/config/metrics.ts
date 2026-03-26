import { createLazyProxy, isRuntime } from '../server/runtime';

/**
 * Lazy-initialized Prometheus registry and metrics to prevent build-time side effects
 * and initialization sequence errors (ReferenceError during bundling).
 * 
 * During build (non-runtime), these return mock objects to ensure absolute build stability.
 */

// Mock classes for build-time safety
class MockMetric {
    inc() {} dec() {} set() {} observe() {} labels() { return this; }
    startTimer() { return () => {}; }
}

export const registry = createLazyProxy(() => {
    if (!isRuntime()) {
        return { setDefaultLabels: () => {}, getSingleMetric: () => null } as any;
    }
    const pc = require('prom-client');
    const reg = new pc.Registry();
    reg.setDefaultLabels({
        environment: process.env.NODE_ENV || 'production',
        region: process.env.NODE_REGION || 'default',
    });
    return reg;
});

const getPC = () => isRuntime() ? require('prom-client') : { Histogram: MockMetric, Counter: MockMetric, Gauge: MockMetric };
const getRedis = () => isRuntime() ? require('../server/redis').default : { pipeline: () => ({ incr: () => {}, incrby: () => {}, incrbyfloat: () => {}, exec: () => Promise.resolve() }) };

// --- Phase 6: Runtime Platform Metrics ---

export const runtimeStartupDuration = createLazyProxy(() => 
    new (getPC().Histogram)({
        name: 'runtime_startup_duration_seconds',
        help: 'Latency in seconds for a preview runtime to become healthy',
        labelNames: ['project_id', 'mode'],
        buckets: [1, 2, 5, 10, 20, 30, 60],
        registers: [registry],
    })
);

export const runtimeCrashesTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'runtime_crashes_total',
        help: 'Total number of runtime crashes or failures',
        labelNames: ['reason', 'mode'],
        registers: [registry],
    })
);

export const runtimeActiveTotal = createLazyProxy(() => 
    new (getPC().Gauge)({
        name: 'runtime_active_total',
        help: 'Total number of active preview runtimes on this node',
        registers: [registry],
    })
);

export const runtimeEvictionsTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'runtime_evictions_total',
        help: 'Total number of runtimes evicted for stale/idle reasons',
        labelNames: ['reason'],
        registers: [registry],
    })
);

export const nodeCpuUsage = createLazyProxy(() => 
    new (getPC().Gauge)({
        name: 'node_cpu_usage_ratio',
        help: 'CPU usage of the current node (0.0 - 1.0)',
        registers: [registry],
    })
);

export const nodeMemoryUsage = createLazyProxy(() => 
    new (getPC().Gauge)({
        name: 'node_memory_usage_bytes',
        help: 'Memory usage of the current node in bytes',
        registers: [registry],
    })
);

export const runtimeProxyErrorsTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'runtime_proxy_errors_total',
        help: 'Total number of reverse proxy failures',
        registers: [registry],
    })
);

// --- Agent Metrics ---

export const agentExecutionDuration = createLazyProxy(() => 
    new (getPC().Histogram)({
        name: 'agent_execution_duration_seconds',
        help: 'Duration of agent execution in seconds',
        labelNames: ['agent_name', 'status'],
        buckets: [1, 5, 10, 30, 60, 120, 300],
        registers: [registry],
    })
);

export const agentFailuresTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'agent_failures_total',
        help: 'Total number of agent failures',
        labelNames: ['agent_name'],
        registers: [registry],
    })
);

export const retryCountTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'retry_count_total',
        help: 'Total number of agent retries',
        labelNames: ['agent_name'],
        registers: [registry],
    })
);

// --- Orchestrator/Execution Level Metrics ---

export const executionSuccessTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'execution_success_total',
        help: 'Total number of successful project generations',
        registers: [registry],
    })
);

export const executionFailureTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'execution_failure_total',
        help: 'Total number of failed project generations',
        registers: [registry],
    })
);

export const stuckBuildsTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'stuck_builds_total',
        help: 'Total number of stuck builds detected and resumed',
        registers: [registry],
    })
);

// --- Queue Metrics ---

export const queueWaitTimeSeconds = createLazyProxy(() => 
    new (getPC().Histogram)({
        name: 'queue_wait_time_seconds',
        help: 'Time a job waits in queue before being picked up',
        labelNames: ['queue_name'],
        buckets: [0.1, 0.5, 1, 5, 10, 30],
        registers: [registry],
    })
);

export const activeBuildsGauge = createLazyProxy(() => 
    new (getPC().Gauge)({
        name: 'active_builds_total',
        help: 'Total number of active builds currently being processed by workers',
        labelNames: ['tier'],
        registers: [registry],
    })
);

export const queueLengthGauge = createLazyProxy(() => 
    new (getPC().Gauge)({
        name: 'queue_length_total',
        help: 'Current number of jobs waiting in the queue',
        labelNames: ['queue_name'],
        registers: [registry],
    })
);

export const lockExtensionTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'lock_extension_total',
        help: 'Total number of BullMQ lock extensions',
        registers: [registry],
    })
);

export const lockExpiredTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'lock_expired_total',
        help: 'Total number of BullMQ lock expirations detected',
        registers: [registry],
    })
);

// --- API & Worker Internal Latency Metrics ---

export const apiRequestDurationSeconds = createLazyProxy(() => 
    new (getPC().Histogram)({
        name: 'api_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
        registers: [registry],
    })
);

export const workerTaskDurationSeconds = createLazyProxy(() => 
    new (getPC().Histogram)({
        name: 'worker_task_duration_seconds',
        help: 'Duration of worker task execution in seconds',
        labelNames: ['queue_name', 'status'],
        buckets: [1, 5, 10, 30, 60, 120, 300, 600],
        registers: [registry],
    })
);

// --- Business/Integration Metrics ---

export const stripeWebhookEventsTotal = createLazyProxy(() => 
    new (getPC().Counter)({
        name: 'stripe_webhook_events_total',
        help: 'Total number of stripe webhook events received',
        labelNames: ['event_type'],
        registers: [registry],
    })
);

/**
 * Persists build metrics to Redis for the /api/metrics endpoint
 */
export async function recordBuildMetrics(
    status: 'success' | 'failed',
    durationMs: number,
    planType: string = 'free',
    tokensUsed: number = 0,
    costUsd: number = 0
) {
    try {
        const client = getRedis();
        const pipeline = client.pipeline();

        // Global metrics
        pipeline.incr('metrics:builds:total');
        if (status === 'failed') {
            pipeline.incr('metrics:builds:failed');
        } else if (status === 'success') {
            pipeline.incr('metrics:builds:success');
        }
        pipeline.incrby('metrics:builds:duration_sum', Math.round(durationMs));
        pipeline.incrby('metrics:tokens:total', tokensUsed);
        pipeline.incrbyfloat('metrics:builds:cost_sum', costUsd);

        // Tier-specific metrics
        pipeline.incr(`metrics:builds:${planType}:total`);
        if (status === 'failed') {
            pipeline.incr(`metrics:builds:${planType}:failed`);
        } else if (status === 'success') {
            pipeline.incr(`metrics:builds:${planType}:success`);
        }
        pipeline.incrby(`metrics:builds:${planType}:duration_sum`, Math.round(durationMs));
        pipeline.incrby(`metrics:tokens:${planType}:total`, tokensUsed);
        pipeline.incrbyfloat(`metrics:builds:${planType}:cost_sum`, costUsd);

        await pipeline.exec();
    } catch {
        // Non-fatal error
    }
}

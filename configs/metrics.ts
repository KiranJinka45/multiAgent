import logger from '@configs/logger';
import { Registry, Histogram, Counter } from 'prom-client';
import redis from '@queue/redis-client';

export const registry = new Registry();

// Enforce safe global low-cardinality labels
registry.setDefaultLabels({
    environment: process.env.NODE_ENV || 'production',
    region: process.env.NODE_REGION || 'default',
});

// --- Phase 6: Runtime Platform Metrics ---

export const runtimeStartupDuration = new Histogram({
    name: 'runtime_startup_duration_seconds',
    help: 'Latency in seconds for a preview runtime to become healthy',
    labelNames: ['project_id', 'mode'],
    buckets: [1, 2, 5, 10, 20, 30, 60], // Max 60s
    registers: [registry],
});

export const runtimeCrashesTotal = new Counter({
    name: 'runtime_crashes_total',
    help: 'Total number of runtime crashes or failures',
    labelNames: ['reason', 'mode'],
    registers: [registry],
});

export const runtimeActiveTotal = new (registry.getSingleMetric('runtime_active_total') as any || (require('prom-client').Gauge))({
    name: 'runtime_active_total',
    help: 'Total number of active preview runtimes on this node',
    registers: [registry],
});

export const runtimeEvictionsTotal = new Counter({
    name: 'runtime_evictions_total',
    help: 'Total number of runtimes evicted for stale/idle reasons',
    labelNames: ['reason'],
    registers: [registry],
});

export const nodeCpuUsage = new (registry.getSingleMetric('node_cpu_usage_ratio') as any || (require('prom-client').Gauge))({
    name: 'node_cpu_usage_ratio',
    help: 'CPU usage of the current node (0.0 - 1.0)',
    registers: [registry],
});

export const nodeMemoryUsage = new (registry.getSingleMetric('node_memory_usage_bytes') as any || (require('prom-client').Gauge))({
    name: 'node_memory_usage_bytes',
    help: 'Memory usage of the current node in bytes',
    registers: [registry],
});

export const runtimeProxyErrorsTotal = new Counter({
    name: 'runtime_proxy_errors_total',
    help: 'Total number of reverse proxy failures',
    registers: [registry],
});

// --- Agent Metrics ---

export const agentExecutionDuration = new Histogram({
    name: 'agent_execution_duration_seconds',
    help: 'Duration of agent execution in seconds',
    labelNames: ['agent_name', 'status'],
    buckets: [1, 5, 10, 30, 60, 120, 300], // buckets in seconds
    registers: [registry],
});

export const agentFailuresTotal = new Counter({
    name: 'agent_failures_total',
    help: 'Total number of agent failures',
    labelNames: ['agent_name'],
    registers: [registry],
});

export const retryCountTotal = new Counter({
    name: 'retry_count_total',
    help: 'Total number of agent retries',
    labelNames: ['agent_name'],
    registers: [registry],
});

// --- Orchestrator/Execution Level Metrics ---

export const executionSuccessTotal = new Counter({
    name: 'execution_success_total',
    help: 'Total number of successful project generations',
    registers: [registry],
});

export const executionFailureTotal = new Counter({
    name: 'execution_failure_total',
    help: 'Total number of failed project generations',
    registers: [registry],
});

export const stuckBuildsTotal = new Counter({
    name: 'stuck_builds_total',
    help: 'Total number of stuck builds detected and resumed',
    registers: [registry],
});

// --- Queue Metrics ---

export const queueWaitTimeSeconds = new Histogram({
    name: 'queue_wait_time_seconds',
    help: 'Time a job waits in queue before being picked up',
    labelNames: ['queue_name'],
    buckets: [0.1, 0.5, 1, 5, 10, 30],
    registers: [registry],
});

export const lockExtensionTotal = new Counter({
    name: 'lock_extension_total',
    help: 'Total number of BullMQ lock extensions',
    registers: [registry],
});

export const lockExpiredTotal = new Counter({
    name: 'lock_expired_total',
    help: 'Total number of BullMQ lock expirations detected',
    registers: [registry],
});

// --- Business/Integration Metrics ---

export const stripeWebhookEventsTotal = new Counter({
    name: 'stripe_webhook_events_total',
    help: 'Total number of stripe webhook events received',
    labelNames: ['event_type'],
    registers: [registry],
});

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
        const pipeline = redis.pipeline();

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

logger.info('Prometheus metrics initialized');

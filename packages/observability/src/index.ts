/**
 * OBSERVABILITY AUTHORITY
 * Centralized structured logging and metrics implementation.
 */
import pino from 'pino';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// ── Structured Logger (Pino) ────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development';
const serviceName = process.env.SERVICE_NAME || 'multiagent-service';

import { 
    contextStorage, 
    getRequestId, 
    getTenantId, 
    getUserId, 
    getExecutionId, 
    getRequestContext, 
    type RequestContext 
} from "./context";

export { 
    contextStorage, 
    getRequestId, 
    getTenantId, 
    getUserId, 
    getExecutionId, 
    getRequestContext, 
    type RequestContext 
};

import { trace, isSpanContextValid } from '@opentelemetry/api';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: (isDev && process.env.NODE_ENV !== 'production' && process.stdout.isTTY) ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        }
    } : undefined,
    base: {
        service: serviceName,
        env: process.env.NODE_ENV || 'development'
    },
    mixin() {
        const store = contextStorage.getStore();
        const activeSpan = trace.getActiveSpan();
        const spanContext = activeSpan?.spanContext();

        const base: Record<string, any> = store ? {
            requestId: store.requestId,
            tenantId: store.tenantId,
            userId: store.userId,
            executionId: store.executionId
        } : {};

        if (spanContext && isSpanContextValid(spanContext)) {
            base.trace_id = spanContext.traceId;
            base.span_id = spanContext.spanId;
            base.trace_flags = `0${spanContext.traceFlags.toString(16)}`;
        }

        return base;
    }
});


/**
 * Execution-scoped logger helper
 */
export const getExecutionLogger = (context: { 
    executionId?: string; 
    requestId?: string;
    [key: string]: any 
}) => {
    return logger.child({
        executionId: context.executionId,
        requestId: context.requestId,
        ...context.metadata
    });
};

// ── Metrics Registry (Service Namespaced) ────────────────────────────────────
const metricPrefix = process.env.METRIC_PREFIX || (serviceName.split('-').pop() + '_');
export const registry = new Registry();

// Default metrics (CPU, Memory, Event Loop) with service prefix
collectDefaultMetrics({ 
    register: registry,
    prefix: metricPrefix 
});

// Standardized Domain Metrics
export const apiRequestDurationSeconds = new Histogram({
    name: `${metricPrefix}request_duration_seconds`,
    help: 'Duration of requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry]
});

// ── Performance & Stability Signals (Phase 21 Tuning) ────────────────────────
export const retryAttemptsTotal = new Counter({
    name: `${metricPrefix}retry_attempts_total`,
    help: 'Total number of request retries detected',
    labelNames: ['source_service', 'target_service'],
    registers: [registry]
});

export const dbQueryDurationSeconds = new Histogram({
    name: `${metricPrefix}db_query_duration_seconds`,
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [registry]
});

// 0 = Closed, 1 = Open, 2 = Half-Open
export const circuitBreakerState = new Gauge({

    name: `${metricPrefix}circuit_breaker_state`,
    help: 'State of the circuit breaker (0=Closed, 1=Open, 2=Half-Open)',
    labelNames: ['target_service'],
    registers: [registry]
});

export const runtimeCrashesTotal = new Counter({
    name: `${metricPrefix}runtime_crashes_total`,
    help: 'Total number of runtime crashes',
    labelNames: ['service', 'reason'],
    registers: [registry]
});

export const runtimeActiveTotal = new Gauge({
    name: `${metricPrefix}runtime_active_total`,
    help: 'Total number of active runtimes',
    registers: [registry]
});

// Queue Golden Signals
export const queueDepth = new Gauge({
    name: `${metricPrefix}queue_depth`,
    help: 'Number of pending jobs in the queue',
    labelNames: ['queue_name'],
    registers: [registry]
});

export const jobProcessingDurationSeconds = new Histogram({
    name: `${metricPrefix}job_duration_seconds`,
    help: 'Duration of worker job processing',
    labelNames: ['job_name', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
    registers: [registry]
});

// ── SRE SLO Metrics (Production Observability) ──────────────────────────────

export const jobTotal = new Counter({
    name: `${metricPrefix}job_total`,
    help: 'Total jobs processed by the worker fleet',
    labelNames: ['status', 'tier'],
    registers: [registry]
});

export const jobRetriesTotal = new Counter({
    name: `${metricPrefix}job_retries_total`,
    help: 'Total retry attempts across all workers',
    labelNames: ['tier'],
    registers: [registry]
});

export const idempotencyCollisionsTotal = new Counter({
    name: `${metricPrefix}idempotency_collisions_total`,
    help: 'Number of times a duplicate side-effect was prevented by the IdempotencyManager',
    labelNames: ['action'],
    registers: [registry]
});

export const staleLockRecoveriesTotal = new Counter({
    name: `${metricPrefix}stale_lock_recoveries_total`,
    help: 'Number of stale idempotency locks recovered from dead workers',
    registers: [registry]
});

export const activeWorkers = new Gauge({
    name: `${metricPrefix}active_workers`,
    help: 'Number of currently active worker instances',
    registers: [registry]
});

// ── Control Plane Metrics (Self-Protection Observability) ────────────────────

export const controlPlaneMode = new Gauge({
    name: `${metricPrefix}control_plane_mode`,
    help: 'Current system operating mode (0=NORMAL, 1=DEGRADED, 2=PROTECT, 3=EMERGENCY)',
    registers: [registry]
});

export const loadSheddingTotal = new Counter({
    name: `${metricPrefix}load_shedding_total`,
    help: 'Total requests rejected by the Control Plane load shedding layer',
    labelNames: ['mode', 'priority'],
    registers: [registry]
});

export const globalRetryBudgetUsed = new Gauge({
    name: `${metricPrefix}global_retry_budget_used`,
    help: 'Current global retry budget utilization ratio (0.0 - 1.0)',
    registers: [registry]
});

export const controlPlaneEvaluationLatency = new Histogram({
    name: `${metricPrefix}control_plane_evaluation_latency`,
    help: 'Latency of control plane mode evaluation cycle',
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [registry]
});

export const controlPlaneModeChangesTotal = new Counter({
    name: `${metricPrefix}control_plane_mode_changes_total`,
    help: 'Total number of control plane mode transitions',
    labelNames: ['from_mode', 'to_mode'],
    registers: [registry]
});

export const controlPlaneFailuresTotal = new Counter({
    name: `${metricPrefix}control_plane_failures_total`,
    help: 'Total number of control plane internal errors',
    registers: [registry]
});

/**
 * Compatibility handler for legacy calls.
 * Tracing is now handled by importing '@packages/observability/otel' at entry.
 */
export const safeInitTelemetry = (options: {
    serviceName: string;
    enableTracing?: boolean;
    startMetricsServer?: boolean;
} | string) => {
    const name = typeof options === 'string' ? options : options.serviceName;
    logger.info({ service: name }, 'Observability registry initialized (Metrics Ready)');
};

export const initTelemetry = safeInitTelemetry;


export const initInstrumentation = () => {};

// ── Compatibility Aliases ───────────────────────────────────────────────────
/**
 * Gateway compatibility: Aliases apiRequestDurationSeconds to the legacy name.
 */
export const httpRequestDuration = apiRequestDurationSeconds;

export * from "./otel";
export * from "./middleware";

import pino from 'pino';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { AsyncLocalStorage } from 'async_hooks';

export const logger = pino();

export const registry = new Registry();

export const apiRequestDurationSeconds = new Histogram({
    name: 'api_request_duration_seconds',
    help: 'Duration of API requests in seconds',
    registers: [registry]
});

export const idempotencyCollisionsTotal = new Counter({
    name: 'idempotency_collisions_total',
    help: 'Total number of idempotency collisions',
    labelNames: ['action', 'region'],
    registers: [registry]
});

export const staleLockRecoveriesTotal = new Counter({
    name: 'stale_lock_recoveries_total',
    help: 'Total number of stale idempotency lock recoveries',
    registers: [registry]
});

export const jobTotal = new Counter({
    name: 'job_total',
    help: 'Total number of jobs processed',
    labelNames: ['queue', 'status'],
    registers: [registry]
});

export const jobRetriesTotal = new Counter({
    name: 'job_retries_total',
    help: 'Total number of job retries',
    labelNames: ['queue'],
    registers: [registry]
});

export const queueDepth = new Gauge({
    name: 'queue_depth',
    help: 'Current depth of the job queue',
    labelNames: ['queue'],
    registers: [registry]
});

export const activeWorkers = new Gauge({
    name: 'active_workers',
    help: 'Number of active workers',
    labelNames: ['service'],
    registers: [registry]
});

export const controlPlaneEvaluationLatency = new Histogram({
    name: 'control_plane_evaluation_latency_seconds',
    help: 'Latency of control plane evaluations',
    registers: [registry]
});

export const controlPlaneModeChangesTotal = new Counter({
    name: 'control_plane_mode_changes_total',
    help: 'Total number of control plane mode changes',
    registers: [registry]
});

export const controlPlaneFailuresTotal = new Counter({
    name: 'control_plane_failures_total',
    help: 'Total number of control plane failures',
    registers: [registry]
});

export const circuitBreakerState = new Gauge({
    name: 'circuit_breaker_state',
    help: 'State of the circuit breaker (0=closed, 1=open, 2=half-open)',
    labelNames: ['target_service'],
    registers: [registry]
});

export const retryAttemptsTotal = new Counter({
    name: 'retry_attempts_total',
    help: 'Total number of retry attempts',
    labelNames: ['source_service', 'target_service'],
    registers: [registry]
});

export const initTelemetry = (serviceName: string) => {
    logger.info({ serviceName }, 'Telemetry initialized');
};

export const safeInitTelemetry = initTelemetry;

export const initTracing = (serviceName: string) => {
    logger.info({ serviceName }, 'Tracing initialized');
};

export interface RequestContext {
    requestId: string;
    tenantId?: string;
    userId?: string;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();

export const getRequestId = () => contextStorage.getStore()?.requestId;
export const getTenantId = () => contextStorage.getStore()?.tenantId;

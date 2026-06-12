import pino from 'pino';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { AsyncLocalStorage } from 'async_hooks';
import * as http from 'http';
import { trace } from '@opentelemetry/api';
import { monitorEventLoopDelay } from 'perf_hooks';

// --- PILLAR: PROMETHEUS CARDINALITY BUDGET GUARDS (Task 4) ---
export function sanitizeLabelValue(value: string): string {
  if (!value) return 'default';
  const safeList = [
    'GOVERNANCE', 'REPLAY', 'IDENTITY', 'TELEMETRY', 'POLICY', 
    'VERIFIED', 'DEGRADED', 'UNTRUSTED', 'ACTIVE', 'ARCHIVED', 
    'FAILED', 'PRIMARY', 'LEASE', 'ANALYTICS', 'LOW', 'MEDIUM', 
    'HIGH', 'CRITICAL', 'SUCCESS', 'ERROR'
  ];
  if (safeList.includes(value.toUpperCase())) {
    return value;
  }
  
  // Allow simple static names (under 16 chars) containing no UUIDs or long dynamic numbers
  if (/^[a-zA-Z_][a-zA-Z0-9_-]{0,15}$/.test(value) && !/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}/.test(value)) {
    return value;
  }

  // Hash dynamic/UUID values into a max pool of 30 buckets to protect Prometheus memory
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return `bucket_${Math.abs(hash % 30)}`;
}

export function sanitizeLabels(labels: Record<string, string | number>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, val] of Object.entries(labels)) {
    sanitized[key] = sanitizeLabelValue(String(val));
  }
  return sanitized;
}

// Intercept labels() on Counter
const originalCounterLabels = Counter.prototype.labels;
Counter.prototype.labels = function(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return originalCounterLabels.call(this, sanitizeLabels(args[0]));
  }
  const sanitizedArgs = args.map(arg => typeof arg === 'string' ? sanitizeLabelValue(arg) : arg);
  return originalCounterLabels.apply(this, sanitizedArgs as any);
};

// Intercept labels() on Gauge
const originalGaugeLabels = Gauge.prototype.labels;
Gauge.prototype.labels = function(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return originalGaugeLabels.call(this, sanitizeLabels(args[0]));
  }
  const sanitizedArgs = args.map(arg => typeof arg === 'string' ? sanitizeLabelValue(arg) : arg);
  return originalGaugeLabels.apply(this, sanitizedArgs as any);
};

// Intercept labels() on Histogram
const originalHistogramLabels = Histogram.prototype.labels;
Histogram.prototype.labels = function(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return originalHistogramLabels.call(this, sanitizeLabels(args[0]));
  }
  const sanitizedArgs = args.map(arg => typeof arg === 'string' ? sanitizeLabelValue(arg) : arg);
  return originalHistogramLabels.apply(this, sanitizedArgs as any);
};

// Intercept direct Counter.prototype.inc
const originalCounterInc = Counter.prototype.inc;
Counter.prototype.inc = function(this: any, ...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    args[0] = sanitizeLabels(args[0]);
  }
  return (originalCounterInc as any).apply(this, args);
};

// Intercept direct Gauge.prototype.set
const originalGaugeSet = Gauge.prototype.set;
Gauge.prototype.set = function(this: any, ...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    args[0] = sanitizeLabels(args[0]);
  }
  return (originalGaugeSet as any).apply(this, args);
};

// Intercept direct Gauge.prototype.inc
const originalGaugeInc = Gauge.prototype.inc;
Gauge.prototype.inc = function(this: any, ...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    args[0] = sanitizeLabels(args[0]);
  }
  return (originalGaugeInc as any).apply(this, args);
};

// Intercept direct Gauge.prototype.dec
const originalGaugeDec = Gauge.prototype.dec;
Gauge.prototype.dec = function(this: any, ...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    args[0] = sanitizeLabels(args[0]);
  }
  return (originalGaugeDec as any).apply(this, args);
};

// Intercept direct Histogram.prototype.observe
const originalHistogramObserve = Histogram.prototype.observe;
Histogram.prototype.observe = function(this: any, ...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    args[0] = sanitizeLabels(args[0]);
  }
  return (originalHistogramObserve as any).apply(this, args);
};

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

export const jobProcessingDurationSeconds = new Histogram({
    name: 'job_processing_duration_seconds',
    help: 'Duration of jobs processed in seconds',
    labelNames: ['job_name', 'status'],
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

// ZTAN Distributed Coordination & Fencing Telemetry
export const leaseFencingRevocationsTotal = new Counter({
    name: 'lease_fencing_revocations_total',
    help: 'Total number of lease fencing revocations',
    labelNames: ['node_id', 'reason'],
    registers: [registry]
});

export const postgresWalReplayLagBytes = new Gauge({
    name: 'postgres_wal_replay_lag_bytes',
    help: 'PostgreSQL WAL replication/replay lag in bytes',
    registers: [registry]
});

export const replayAuditDriftsTotal = new Counter({
    name: 'replay_audit_drifts_total',
    help: 'Total number of replay audit drifts detected',
    labelNames: ['service', 'severity'],
    registers: [registry]
});

export const heartbeatDriftSeconds = new Histogram({
    name: 'heartbeat_drift_seconds',
    help: 'Drift histogram for lease heartbeat arrivals',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [registry]
});

export const activeLeaseGeneration = new Gauge({
    name: 'active_lease_generation',
    help: 'Active lease generation epoch number',
    labelNames: ['node_id'],
    registers: [registry]
});

export const operatorActionsTotal = new Counter({
    name: 'operator_actions_total',
    help: 'Total number of operator interventions and HSM overrides',
    labelNames: ['operator_id', 'action_type'],
    registers: [registry]
});

export const invariantBreachesTotal = new Counter({
    name: 'invariant_breaches_total',
    help: 'Total number of core invariant breaches detected',
    labelNames: ['invariant_id', 'severity'],
    registers: [registry]
});

export const operatorCertaintyInflationTotal = new Counter({
    name: 'ztan_operator_certainty_inflation_total',
    help: 'Total number of operator certainty inflation overrides',
    labelNames: ['drill_id', 'method'],
    registers: [registry]
});

export const operatorOverrideDisagreementTotal = new Counter({
    name: 'ztan_operator_override_disagreement_total',
    help: 'Total number of override disagreements where operator overrode a ledger fracture without complete multi-sig consensus',
    labelNames: ['drill_id', 'method'],
    registers: [registry]
});

// ZTAN Witness Recorder & Replay Engine Telemetry
export const ztanWitnessAppendDuration = new Histogram({
    name: 'ztan_witness_append_duration_seconds',
    help: 'Latency of appending new evidence ledger entries',
    labelNames: ['category', 'service'],
    registers: [registry]
});

export const ztanWitnessReplayDuration = new Histogram({
    name: 'ztan_witness_replay_duration_seconds',
    help: 'Duration of rebuilding and verifying evidence chains',
    labelNames: ['incident_id', 'state'],
    registers: [registry]
});

export const ztanWitnessQueueBacklog = new Gauge({
    name: 'ztan_witness_queue_backlog_total',
    help: 'Current queue backlog for the asynchronous ledger recorder',
    registers: [registry]
});

export const ztanWitnessSignatureFailures = new Counter({
    name: 'ztan_witness_signature_failures_total',
    help: 'Total number of signature validation failures in the evidence ledger',
    labelNames: ['signer_id', 'algorithm'],
    registers: [registry]
});

export const ztanWitnessIngestionRejections = new Counter({
    name: 'ztan_witness_ingestion_rejections_total',
    help: 'Total number of ingestion rejections due to invariant violations or corrupt metadata',
    labelNames: ['service', 'reason'],
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

/**
 * Starts a standalone lightweight HTTP server to export Prometheus registry metrics
 * to external scrapers (e.g. Prometheus Server) on a dedicated port.
 */
export const startMetricsServer = (port: number): Promise<http.Server> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            if (req.url === '/metrics') {
                try {
                    res.writeHead(200, { 'Content-Type': registry.contentType });
                    res.end(await registry.metrics());
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end(String(err));
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });
        server.listen(port, () => {
            logger.info({ port }, 'Prometheus metrics exporter server listening');
            resolve(server);
        });
    });
};

import * as crypto from 'crypto';

export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry]
});

export const correlationMiddleware = (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || req.headers['X-Request-ID'] || crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    if (res.setHeader) {
        res.setHeader('X-Request-ID', requestId as string);
    }
    const store: RequestContext = {
        requestId: requestId as string,
        tenantId: (req.headers['x-tenant-id'] || req.headers['X-Tenant-ID']) as string,
        userId: (req.headers['x-user-id'] || req.headers['X-User-ID']) as string,
    };
    contextStorage.run(store, () => {
        next();
    });
};

// ZTAN Engine Telemetry, Tracing & Analytics
export const tracer = trace.getTracer('ztan-runtime', '1.0.0');

export const ztanWorkflowDurationSeconds = new Histogram({
    name: 'ztan_workflow_duration_seconds',
    help: 'Latency of completed workflows in seconds',
    labelNames: ['workflow_name', 'status'],
    registers: [registry]
});

export const ztanWorkflowReplayDurationSeconds = new Histogram({
    name: 'ztan_workflow_replay_duration_seconds',
    help: 'Time spent replaying workflow logs in seconds',
    labelNames: ['workflow_name'],
    registers: [registry]
});

export const ztanTaskQueueDepth = new Gauge({
    name: 'ztan_task_queue_depth',
    help: 'Current size of active execution task queue',
    labelNames: ['workflow_id'],
    registers: [registry]
});

export const ztanWalThroughputBytes = new Counter({
    name: 'ztan_wal_throughput_bytes_total',
    help: 'Total volume of WAL logs written in bytes',
    registers: [registry]
});

export const ztanPartitionRingSize = new Gauge({
    name: 'ztan_partition_ring_size',
    help: 'Number of active nodes on consistent hash ring',
    registers: [registry]
});

export const ztanQuorumLatencySeconds = new Histogram({
    name: 'ztan_quorum_latency_seconds',
    help: 'Quorum network replication latency in seconds',
    registers: [registry]
});

export const ztanTenantExecutionsTotal = new Counter({
    name: 'ztan_tenant_executions_total',
    help: 'Total number of started workflow executions per tenant',
    labelNames: ['tenant_id', 'workflow_name'],
    registers: [registry]
});

export const ztanTenantStepExecutionsTotal = new Counter({
    name: 'ztan_tenant_step_executions_total',
    help: 'Total number of workflow steps executed per tenant',
    labelNames: ['tenant_id', 'workflow_name', 'step_name'],
    registers: [registry]
});

export const ztanDivergenceEventsTotal = new Counter({
    name: 'ztan_divergence_events_total',
    help: 'Total number of replay divergence incidents detected',
    labelNames: ['workflow_name', 'mismatch_type'],
    registers: [registry]
});

// System / Substrate Telemetry
export const eventLoopLagNs = new Gauge({
    name: 'nodejs_event_loop_lag_nanoseconds',
    help: 'Event loop lag measured in nanoseconds (p50, p90, p99)',
    labelNames: ['percentile'],
    registers: [registry]
});

export const prismaActiveWaiters = new Gauge({
    name: 'prisma_pool_active_waiters_total',
    help: 'Number of active waiters in the Prisma connection pool queue',
    labelNames: ['role'],
    registers: [registry]
});

export const prismaWaitDurationSeconds = new Histogram({
    name: 'prisma_pool_wait_duration_seconds',
    help: 'Histogram of time spent waiting for a Prisma connection',
    labelNames: ['role'],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    registers: [registry]
});

export const prismaQueryDurationSeconds = new Histogram({
    name: 'prisma_query_duration_seconds',
    help: 'Duration of Prisma database queries in seconds',
    labelNames: ['model', 'action'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [registry]
});

export const prismaPoolQueueAgeSeconds = new Histogram({
    name: 'prisma_pool_queue_age_seconds',
    help: 'Histogram of queue age for connections in seconds',
    labelNames: ['role'],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    registers: [registry]
});

export const prismaActiveConnections = new Gauge({
    name: 'prisma_pool_active_connections',
    help: 'Number of active connections in the Prisma pool',
    labelNames: ['role'],
    registers: [registry]
});

export const prismaIdleConnections = new Gauge({
    name: 'prisma_pool_idle_connections',
    help: 'Number of idle connections in the Prisma pool',
    labelNames: ['role'],
    registers: [registry]
});

export const gcPauseDurationSeconds = new Histogram({
    name: 'nodejs_gc_pause_duration_seconds',
    help: 'Duration of garbage collection pauses in seconds',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [registry]
});

export const heapGrowthSlope = new Gauge({
    name: 'nodejs_heap_growth_slope_bytes_per_second',
    help: 'Slope of heap memory growth in bytes per second',
    registers: [registry]
});

export const heapUsedBytes = new Gauge({
    name: 'nodejs_heap_used_bytes',
    help: 'Process heap memory usage in bytes',
    registers: [registry]
});

export const activePromiseBacklog = new Gauge({
    name: 'nodejs_active_promise_backlog_total',
    help: 'Total number of active unresolved promises',
    registers: [registry]
});

export const activeHandles = new Gauge({
    name: 'nodejs_active_handles_total',
    help: 'Total number of active handles in the event loop',
    registers: [registry]
});

export const activeRequests = new Gauge({
    name: 'nodejs_active_requests_total',
    help: 'Total number of active requests in the event loop',
    registers: [registry]
});

export const websocketOutboundQueueDepth = new Gauge({
    name: 'websocket_outbound_queue_depth_total',
    help: 'Total depth of outbound websocket queues across all clients',
    registers: [registry]
});

export const websocketSerializationLatency = new Histogram({
    name: 'websocket_serialization_latency_seconds',
    help: 'Time spent serializing websocket messages in seconds',
    buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
    registers: [registry]
});

// Start the event loop lag monitor
const elMonitor = monitorEventLoopDelay({ resolution: 10 });
elMonitor.enable();

// Update gauges periodically (every 5s)
setInterval(() => {
    eventLoopLagNs.labels('p50').set(elMonitor.percentile(50));
    eventLoopLagNs.labels('p90').set(elMonitor.percentile(90));
    eventLoopLagNs.labels('p99').set(elMonitor.percentile(99));
    elMonitor.reset();
}, 5000).unref();

// GC Observer
import('perf_hooks').then(({ PerformanceObserver }) => {
    const gcObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
            gcPauseDurationSeconds.observe(entry.duration / 1000);
        });
    });
    gcObserver.observe({ entryTypes: ['gc'] });
}).catch(() => {});

// Background loop for process stats (every 2s)
let lastHeapUsed = 0;
let lastSlopeTime = performance.now();

setInterval(() => {
    const mem = process.memoryUsage();
    const now = performance.now();
    const elapsedSeconds = (now - lastSlopeTime) / 1000;
    
    if (elapsedSeconds > 0 && lastHeapUsed > 0) {
        const slope = (mem.heapUsed - lastHeapUsed) / elapsedSeconds;
        heapGrowthSlope.set(slope);
    }
    
    lastHeapUsed = mem.heapUsed;
    lastSlopeTime = now;
    
    heapUsedBytes.set(mem.heapUsed);
    
    if (typeof (process as any)._getActiveHandles === 'function') {
        try {
            activeHandles.set((process as any)._getActiveHandles().length);
        } catch (_e) {}
    }
    if (typeof (process as any)._getActiveRequests === 'function') {
        try {
            activeRequests.set((process as any)._getActiveRequests().length);
        } catch (_e) {}
    }
}, 2000).unref();export { Counter, Gauge, Histogram };

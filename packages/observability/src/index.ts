import pino from 'pino';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { AsyncLocalStorage } from 'async_hooks';
import * as http from 'http';
import { trace } from '@opentelemetry/api';


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


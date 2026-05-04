"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestDuration = exports.initInstrumentation = exports.initTelemetry = exports.safeInitTelemetry = exports.controlPlaneFailuresTotal = exports.controlPlaneModeChangesTotal = exports.controlPlaneEvaluationLatency = exports.globalRetryBudgetUsed = exports.loadSheddingTotal = exports.controlPlaneMode = exports.activeWorkers = exports.staleLockRecoveriesTotal = exports.idempotencyCollisionsTotal = exports.jobRetriesTotal = exports.jobTotal = exports.jobProcessingDurationSeconds = exports.queueDepth = exports.runtimeActiveTotal = exports.runtimeCrashesTotal = exports.circuitBreakerState = exports.dbQueryDurationSeconds = exports.retryAttemptsTotal = exports.apiRequestDurationSeconds = exports.registry = exports.getExecutionLogger = exports.logger = exports.getRequestContext = exports.getExecutionId = exports.getUserId = exports.getTenantId = exports.getRequestId = exports.contextStorage = void 0;
/**
 * OBSERVABILITY AUTHORITY
 * Centralized structured logging and metrics implementation.
 */
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = require("prom-client");
// ── Structured Logger (Pino) ────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development';
const serviceName = process.env.SERVICE_NAME || 'multiagent-service';
const context_1 = require("./context");
Object.defineProperty(exports, "contextStorage", { enumerable: true, get: function () { return context_1.contextStorage; } });
Object.defineProperty(exports, "getRequestId", { enumerable: true, get: function () { return context_1.getRequestId; } });
Object.defineProperty(exports, "getTenantId", { enumerable: true, get: function () { return context_1.getTenantId; } });
Object.defineProperty(exports, "getUserId", { enumerable: true, get: function () { return context_1.getUserId; } });
Object.defineProperty(exports, "getExecutionId", { enumerable: true, get: function () { return context_1.getExecutionId; } });
Object.defineProperty(exports, "getRequestContext", { enumerable: true, get: function () { return context_1.getRequestContext; } });
const api_1 = require("@opentelemetry/api");
exports.logger = (0, pino_1.default)({
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
        const store = context_1.contextStorage.getStore();
        const activeSpan = api_1.trace.getActiveSpan();
        const spanContext = activeSpan?.spanContext();
        const base = store ? {
            requestId: store.requestId,
            tenantId: store.tenantId,
            userId: store.userId,
            executionId: store.executionId
        } : {};
        if (spanContext && (0, api_1.isSpanContextValid)(spanContext)) {
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
const getExecutionLogger = (context) => {
    return exports.logger.child({
        executionId: context.executionId,
        requestId: context.requestId,
        ...context.metadata
    });
};
exports.getExecutionLogger = getExecutionLogger;
// ── Metrics Registry (Service Namespaced) ────────────────────────────────────
const metricPrefix = process.env.METRIC_PREFIX || (serviceName.split('-').pop() + '_');
exports.registry = new prom_client_1.Registry();
// Default metrics (CPU, Memory, Event Loop) with service prefix
(0, prom_client_1.collectDefaultMetrics)({
    register: exports.registry,
    prefix: metricPrefix
});
// Standardized Domain Metrics
exports.apiRequestDurationSeconds = new prom_client_1.Histogram({
    name: `${metricPrefix}request_duration_seconds`,
    help: 'Duration of requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.registry]
});
// ── Performance & Stability Signals (Phase 21 Tuning) ────────────────────────
exports.retryAttemptsTotal = new prom_client_1.Counter({
    name: `${metricPrefix}retry_attempts_total`,
    help: 'Total number of request retries detected',
    labelNames: ['source_service', 'target_service'],
    registers: [exports.registry]
});
exports.dbQueryDurationSeconds = new prom_client_1.Histogram({
    name: `${metricPrefix}db_query_duration_seconds`,
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [exports.registry]
});
// 0 = Closed, 1 = Open, 2 = Half-Open
exports.circuitBreakerState = new prom_client_1.Gauge({
    name: `${metricPrefix}circuit_breaker_state`,
    help: 'State of the circuit breaker (0=Closed, 1=Open, 2=Half-Open)',
    labelNames: ['target_service'],
    registers: [exports.registry]
});
exports.runtimeCrashesTotal = new prom_client_1.Counter({
    name: `${metricPrefix}runtime_crashes_total`,
    help: 'Total number of runtime crashes',
    labelNames: ['service', 'reason'],
    registers: [exports.registry]
});
exports.runtimeActiveTotal = new prom_client_1.Gauge({
    name: `${metricPrefix}runtime_active_total`,
    help: 'Total number of active runtimes',
    registers: [exports.registry]
});
// Queue Golden Signals
exports.queueDepth = new prom_client_1.Gauge({
    name: `${metricPrefix}queue_depth`,
    help: 'Number of pending jobs in the queue',
    labelNames: ['queue_name'],
    registers: [exports.registry]
});
exports.jobProcessingDurationSeconds = new prom_client_1.Histogram({
    name: `${metricPrefix}job_duration_seconds`,
    help: 'Duration of worker job processing',
    labelNames: ['job_name', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
    registers: [exports.registry]
});
// ── SRE SLO Metrics (Production Observability) ──────────────────────────────
exports.jobTotal = new prom_client_1.Counter({
    name: `${metricPrefix}job_total`,
    help: 'Total jobs processed by the worker fleet',
    labelNames: ['status', 'tier'],
    registers: [exports.registry]
});
exports.jobRetriesTotal = new prom_client_1.Counter({
    name: `${metricPrefix}job_retries_total`,
    help: 'Total retry attempts across all workers',
    labelNames: ['tier'],
    registers: [exports.registry]
});
exports.idempotencyCollisionsTotal = new prom_client_1.Counter({
    name: `${metricPrefix}idempotency_collisions_total`,
    help: 'Number of times a duplicate side-effect was prevented by the IdempotencyManager',
    labelNames: ['action'],
    registers: [exports.registry]
});
exports.staleLockRecoveriesTotal = new prom_client_1.Counter({
    name: `${metricPrefix}stale_lock_recoveries_total`,
    help: 'Number of stale idempotency locks recovered from dead workers',
    registers: [exports.registry]
});
exports.activeWorkers = new prom_client_1.Gauge({
    name: `${metricPrefix}active_workers`,
    help: 'Number of currently active worker instances',
    registers: [exports.registry]
});
// ── Control Plane Metrics (Self-Protection Observability) ────────────────────
exports.controlPlaneMode = new prom_client_1.Gauge({
    name: `${metricPrefix}control_plane_mode`,
    help: 'Current system operating mode (0=NORMAL, 1=DEGRADED, 2=PROTECT, 3=EMERGENCY)',
    registers: [exports.registry]
});
exports.loadSheddingTotal = new prom_client_1.Counter({
    name: `${metricPrefix}load_shedding_total`,
    help: 'Total requests rejected by the Control Plane load shedding layer',
    labelNames: ['mode', 'priority'],
    registers: [exports.registry]
});
exports.globalRetryBudgetUsed = new prom_client_1.Gauge({
    name: `${metricPrefix}global_retry_budget_used`,
    help: 'Current global retry budget utilization ratio (0.0 - 1.0)',
    registers: [exports.registry]
});
exports.controlPlaneEvaluationLatency = new prom_client_1.Histogram({
    name: `${metricPrefix}control_plane_evaluation_latency`,
    help: 'Latency of control plane mode evaluation cycle',
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [exports.registry]
});
exports.controlPlaneModeChangesTotal = new prom_client_1.Counter({
    name: `${metricPrefix}control_plane_mode_changes_total`,
    help: 'Total number of control plane mode transitions',
    labelNames: ['from_mode', 'to_mode'],
    registers: [exports.registry]
});
exports.controlPlaneFailuresTotal = new prom_client_1.Counter({
    name: `${metricPrefix}control_plane_failures_total`,
    help: 'Total number of control plane internal errors',
    registers: [exports.registry]
});
/**
 * Compatibility handler for legacy calls.
 * Tracing is now handled by importing '@packages/observability/otel' at entry.
 */
const safeInitTelemetry = (options) => {
    const name = typeof options === 'string' ? options : options.serviceName;
    exports.logger.info({ service: name }, 'Observability registry initialized (Metrics Ready)');
};
exports.safeInitTelemetry = safeInitTelemetry;
exports.initTelemetry = exports.safeInitTelemetry;
const initInstrumentation = () => { };
exports.initInstrumentation = initInstrumentation;
// ── Compatibility Aliases ───────────────────────────────────────────────────
/**
 * Gateway compatibility: Aliases apiRequestDurationSeconds to the legacy name.
 */
exports.httpRequestDuration = exports.apiRequestDurationSeconds;
__exportStar(require("./otel"), exports);
__exportStar(require("./middleware"), exports);
//# sourceMappingURL=index.js.map
/**
 * OBSERVABILITY AUTHORITY
 * Centralized structured logging and metrics implementation.
 */
import pino from 'pino';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { contextStorage, getRequestId, getTenantId, getUserId, getExecutionId, getRequestContext, type RequestContext } from "./context";
export { contextStorage, getRequestId, getTenantId, getUserId, getExecutionId, getRequestContext, type RequestContext };
export declare const logger: pino.Logger<never, boolean>;
/**
 * Execution-scoped logger helper
 */
export declare const getExecutionLogger: (context: {
    executionId?: string;
    requestId?: string;
    [key: string]: any;
}) => pino.Logger<never, boolean>;
export declare const registry: Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const apiRequestDurationSeconds: Histogram<"route" | "method" | "status_code">;
export declare const retryAttemptsTotal: Counter<"source_service" | "target_service">;
export declare const dbQueryDurationSeconds: Histogram<"operation" | "model">;
export declare const circuitBreakerState: Gauge<"target_service">;
export declare const runtimeCrashesTotal: Counter<"service" | "reason">;
export declare const runtimeActiveTotal: Gauge<string>;
export declare const queueDepth: Gauge<"queue_name">;
export declare const jobProcessingDurationSeconds: Histogram<"job_name" | "status">;
export declare const jobTotal: Counter<"status" | "tier">;
export declare const jobRetriesTotal: Counter<"tier">;
export declare const idempotencyCollisionsTotal: Counter<"action">;
export declare const staleLockRecoveriesTotal: Counter<string>;
export declare const activeWorkers: Gauge<string>;
export declare const controlPlaneMode: Gauge<string>;
export declare const loadSheddingTotal: Counter<"mode" | "priority">;
export declare const globalRetryBudgetUsed: Gauge<string>;
export declare const controlPlaneEvaluationLatency: Histogram<string>;
export declare const controlPlaneModeChangesTotal: Counter<"from_mode" | "to_mode">;
export declare const controlPlaneFailuresTotal: Counter<string>;
/**
 * Compatibility handler for legacy calls.
 * Tracing is now handled by importing '@packages/observability/otel' at entry.
 */
export declare const safeInitTelemetry: (options: {
    serviceName: string;
    enableTracing?: boolean;
    startMetricsServer?: boolean;
} | string) => void;
export declare const initTelemetry: (options: {
    serviceName: string;
    enableTracing?: boolean;
    startMetricsServer?: boolean;
} | string) => void;
export declare const initInstrumentation: () => void;
/**
 * Gateway compatibility: Aliases apiRequestDurationSeconds to the legacy name.
 */
export declare const httpRequestDuration: Histogram<"route" | "method" | "status_code">;
export * from "./otel";
export * from "./middleware";
//# sourceMappingURL=index.d.ts.map
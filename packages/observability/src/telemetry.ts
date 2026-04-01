import { register, startMetricsServer, workerJobDuration, httpRequestDuration } from "./metrics";
import { initInstrumentation } from "./tracing";
import { logger } from "./logger";

export interface TelemetryConfig {
  serviceName: string;
  metricsPort?: number;
  enableTracing?: boolean;
  startMetricsServer?: boolean;
}

/**
 * Initialize full observability stack for a service:
 * - OpenTelemetry tracing
 * - Prometheus metrics server (optional)
 * - Default metrics collection
 *
 * Call this once at the top of your service entrypoint.
 */
export function initTelemetry(config: TelemetryConfig) {
  const { 
    serviceName, 
    metricsPort = 9091, 
    enableTracing = true, 
    startMetricsServer: shouldStartServer = true 
  } = config;

  logger.info({ serviceName, metricsPort, enableTracing, shouldStartServer }, '[Telemetry] Initializing observability stack');

  // 1. Start OpenTelemetry tracing
  if (enableTracing) {
    initInstrumentation(serviceName);
    logger.info({ serviceName }, '[Telemetry] OpenTelemetry tracing active');
  }

  // 2. Start standalone metrics server for Prometheus scraping if requested
  let metricsServer;
  if (shouldStartServer) {
    metricsServer = startMetricsServer(metricsPort);
    logger.info({ serviceName, metricsPort }, '[Telemetry] Prometheus metrics server active');
  }

  return {
    register,
    metricsServer,
    workerJobDuration,
    httpRequestDuration,
  };
}

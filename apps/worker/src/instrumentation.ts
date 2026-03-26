import { initInstrumentation as startTracing } from '@libs/observability';

/**
 * Worker Instrumentation
 * Initializes OpenTelemetry tracing before any other modules are loaded.
 * This is critical for capturing all spans from automated instrumentations.
 */
export async function initInstrumentation(serviceName: string) {
  return startTracing(serviceName);
}

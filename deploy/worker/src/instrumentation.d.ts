/**
 * Worker Instrumentation
 * Initializes OpenTelemetry tracing before any other modules are loaded.
 * This is critical for capturing all spans from automated instrumentations.
 */
export declare function initInstrumentation(_serviceName: string): Promise<void>;

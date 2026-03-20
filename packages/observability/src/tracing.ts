import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logger } from '@libs/utils';

/**
 * OpenTelemetry Node SDK Setup
 * Enables distributed tracing and auto-instrumentation for Node.js services.
 */
export const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'multi-agent-service',
    }),
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

export async function startTracing() {
    try {
        await sdk.start();
        logger.info({ service: process.env.OTEL_SERVICE_NAME }, '[OTel] Tracing initialized successfully');
    } catch (error) {
        logger.error({ error }, '[OTel] Failed to start tracing');
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => logger.info('[OTel] Tracing terminated'))
        .catch((error) => logger.error({ error }, '[OTel] Error terminating tracing'))
        .finally(() => process.exit(0));
});

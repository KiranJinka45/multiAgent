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
let sdk: NodeSDK | null = null;

export async function initTelemetry(serviceName: string) {
    if (sdk) return;

    sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
        traceExporter: new OTLPTraceExporter({
            url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        }),
        instrumentations: [getNodeAutoInstrumentations()],
    });

    try {
        await sdk.start();
        logger.info({ service: serviceName }, '[OTel] Tracing initialized successfully');
    } catch (error) {
        logger.error({ error, service: serviceName }, '[OTel] Failed to start tracing');
    }
}

export async function shutdownTelemetry() {
    if (!sdk) return;

    try {
        await sdk.shutdown();
        logger.info('[OTel] Tracing terminated');
    } catch (error) {
        logger.error({ error }, '[OTel] Error terminating tracing');
    } finally {
        sdk = null;
    }
}

// Graceful shutdown handlers
const handleShutdown = async () => {
    await shutdownTelemetry();
    process.exit(0);
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

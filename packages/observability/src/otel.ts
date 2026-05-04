/**
 * OTEL BOOTSTRAP AUTHORITY
 * This file MUST be imported as the absolute first line of every service entry point.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

// Ensure OTEL is initialized only once
let sdk: NodeSDK | null = null;

const serviceName = process.env.SERVICE_NAME || 'multiagent-unknown';

if (!sdk && process.env.ENABLE_TRACING === 'true') {
    const exporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4317',
    });

    sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
        }),
        traceExporter: exporter,
        instrumentations: [getNodeAutoInstrumentations()],
        textMapPropagator: new W3CTraceContextPropagator(),
    });

    sdk.start();
    // Manual log since this runs before the main logger is guaranteed to be ready
    console.log(`[OTEL] 🛰️ OpenTelemetry SDK initialized for ${serviceName}`);
}

export { sdk };

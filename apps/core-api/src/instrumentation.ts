/**
 * Core API Self-Instrumentation
 *
 * Bootstraps the OpenTelemetry SDK for the Core API service.
 * This MUST be required before any other imports to ensure
 * automatic instrumentation of http, express, and redis is applied.
 *
 * Usage: Add `--require ./dist/instrumentation.js` to node start command,
 *        or import at the very top of src/index.ts.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const OTEL_COLLECTOR_URL = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318';

const sdk = new NodeSDK({
    resource: new (require('@opentelemetry/resources').Resource)({
        [SEMRESATTRS_SERVICE_NAME]: 'multiagent-core-api',
        [SEMRESATTRS_SERVICE_VERSION]: '1.0.0'
    }),
    traceExporter: new OTLPTraceExporter({
        url: `${OTEL_COLLECTOR_URL}/v1/traces`,
        headers: {}
    }) as any,
    instrumentations: [
        getNodeAutoInstrumentations({
            // Disable noisy file instrumentation; keep http, express, redis
            '@opentelemetry/instrumentation-fs': { enabled: false }
        })
    ]
});

// Graceful startup — if the collector is unavailable, we log a warning
// but do NOT crash the process (critical for local dev without a collector)
try {
    sdk.start();
    console.log(`[Instrumentation] OTel SDK started. Exporting traces to ${OTEL_COLLECTOR_URL}`);
} catch (error) {
    console.warn('[Instrumentation] OTel SDK failed to start. Running without tracing:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('[Instrumentation] OTel SDK shut down cleanly'))
        .catch((err) => console.error('[Instrumentation] Error shutting down OTel SDK:', err))
        .finally(() => process.exit(0));
});

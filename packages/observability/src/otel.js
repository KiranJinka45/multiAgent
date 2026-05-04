"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdk = void 0;
/**
 * OTEL BOOTSTRAP AUTHORITY
 * This file MUST be imported as the absolute first line of every service entry point.
 */
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_grpc_1 = require("@opentelemetry/exporter-trace-otlp-grpc");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const core_1 = require("@opentelemetry/core");
// Ensure OTEL is initialized only once
let sdk = null;
exports.sdk = sdk;
const serviceName = process.env.SERVICE_NAME || 'multiagent-unknown';
if (!sdk && process.env.ENABLE_TRACING === 'true') {
    const exporter = new exporter_trace_otlp_grpc_1.OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4317',
    });
    exports.sdk = sdk = new sdk_node_1.NodeSDK({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
        }),
        traceExporter: exporter,
        instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
        textMapPropagator: new core_1.W3CTraceContextPropagator(),
    });
    sdk.start();
    // Manual log since this runs before the main logger is guaranteed to be ready
    console.log(`[OTEL] 🛰️ OpenTelemetry SDK initialized for ${serviceName}`);
}
//# sourceMappingURL=otel.js.map
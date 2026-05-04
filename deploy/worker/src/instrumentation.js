"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initInstrumentation = initInstrumentation;
// @ts-nocheck
const observability_1 = require("@packages/observability");
/**
 * Worker Instrumentation
 * Initializes OpenTelemetry tracing before any other modules are loaded.
 * This is critical for capturing all spans from automated instrumentations.
 */
async function initInstrumentation(_serviceName) {
    return (0, observability_1.initInstrumentation)();
}
//# sourceMappingURL=instrumentation.js.map
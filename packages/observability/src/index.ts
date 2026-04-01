export * from "./logger";
export * from "./metrics";
export { initInstrumentation } from "./tracing";
export { initTelemetry } from "./telemetry";

import { logger } from "./logger";
export default logger;

// Execution-scoped logger factory (used by orchestrator)
export function getExecutionLogger(executionId: string) {
  return logger.child({ executionId });
}

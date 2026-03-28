export * from "./logger";
export * from "./metrics";

// Tracing is server-side only. Node apps should import it directly from './tracing'.
// We don't export it here to prevent leaking Node-only modules (like http2/grpc) into the frontend.




import { logger } from "./logger";
export default logger;


// Execution-scoped logger factory (used by orchestrator)
export function getExecutionLogger(executionId: string) {
  return logger.child({ executionId });
}

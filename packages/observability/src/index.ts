export * from "./logger";
export * from "./metrics";
export * from "./tracing";

import { logger } from "./logger";

// Support `import logger from '@libs/observability'` (used in 50+ files)
export default logger;

// Execution-scoped logger factory (used by orchestrator)
export function getExecutionLogger(executionId: string) {
  return logger.child({ executionId });
}

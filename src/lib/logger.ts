import pino from 'pino';
import { getCorrelationId } from './tracing';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        env: process.env.NODE_ENV,
        service: 'multi-agent-platform',
    },
    mixin() {
        return {
            correlationId: getCorrelationId(),
            // executionId is often passed in specific log calls, 
            // but we can also pull from AsyncLocalStorage if we add it there later
        };
    },
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Creates a child logger with a fixed executionId for a specific build job.
 */
export function getExecutionLogger(executionId: string) {
    return logger.child({ executionId });
}

export default logger;

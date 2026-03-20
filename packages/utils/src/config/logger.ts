import pino from 'pino';
import { getCorrelationId } from './tracing';
import { trace, context } from '@opentelemetry/api';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        env: process.env.NODE_ENV,
        service: 'multi-agent-platform',
    },
    mixin() {
        const span = trace.getSpan(context.active());
        const spanContext = span?.spanContext();
        
        return {
            correlationId: getCorrelationId(),
            traceId: spanContext?.traceId,
            spanId: spanContext?.spanId,
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

export { logger };
export default logger;

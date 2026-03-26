import pino from 'pino';
import { getCorrelationId } from '../server/tracing';
import { trace, context } from '@opentelemetry/api';

const transports = pino.transport({
    targets: [
        {
            target: 'pino/file', // Default console output
            options: { destination: 1 }, // stdout
            level: process.env.LOG_LEVEL || 'info',
        },
        ...(process.env.LOKI_URL ? [{
            target: 'pino-loki',
            options: {
                host: process.env.LOKI_URL,
                labels: { service: 'multi-agent-platform' },
                batching: true,
                interval: 5,
            },
            level: 'info',
        }] : []),
    ],
});

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
}, transports);

/**
 * Creates a child logger with a fixed executionId for a specific build job.
 */
export function getExecutionLogger(executionId: string) {
    return logger.child({ executionId });
}

export { logger };
export default logger;

import pino from 'pino';
import { getCorrelationId } from './tracing';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        env: process.env.NODE_ENV,
        service: 'multi-agent-platform',
    },
    mixin() {
        return { correlationId: getCorrelationId() };
    },
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

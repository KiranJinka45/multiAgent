import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const tracingContext = new AsyncLocalStorage<string>();

export function getCorrelationId(): string {
    return tracingContext.getStore() || 'no-correlation-id';
}

export function runWithTracing<T>(id: string | undefined, fn: () => T): T {
    const correlationId = id || uuidv4();
    return tracingContext.run(correlationId, fn);
}

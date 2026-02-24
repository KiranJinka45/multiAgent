import logger from './logger';

export enum CircuitState {
    CLOSED, // System is healthy
    OPEN,   // System failed too much, blocking requests
    HALF_OPEN // System is testing recovery
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureThreshold: number;
    private resetTimeoutMs: number;
    private failureCount: number = 0;
    private lastFailureTime?: number;

    constructor(failureThreshold: number = 5, resetTimeoutMs: number = 30000) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }

    async execute<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeoutMs) {
                this.state = CircuitState.HALF_OPEN;
                logger.info('Circuit breaker entering HALF_OPEN state');
            } else {
                throw new Error('Circuit Breaker is OPEN. External service unavailable.');
            }
        }

        try {
            const result = await action();
            this.handleSuccess();
            return result;
        } catch (error) {
            this.handleFailure();
            throw error;
        }
    }

    private handleSuccess() {
        this.failureCount = 0;
        this.state = CircuitState.CLOSED;
    }

    private handleFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            this.state = CircuitState.OPEN;
            logger.error({ failureCount: this.failureCount }, 'Circuit breaker is now OPEN');
        }
    }

    getState() { return this.state; }
}

// Global registry for circuit breakers
export const breakers: Record<string, CircuitBreaker> = {
    llm: new CircuitBreaker(5, 60000), // LLM breaker: 5 errors = 1 min block
};

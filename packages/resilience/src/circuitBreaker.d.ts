import CircuitBreaker from 'opossum';
/**
 * Circuit Breaker Factory
 * Wraps an asynchronous function with a circuit breaker for fault tolerance.
 */
export declare function createBreaker(fn: (...args: unknown[]) => Promise<unknown>, options?: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
}): CircuitBreaker<unknown[], unknown>;
//# sourceMappingURL=circuitBreaker.d.ts.map
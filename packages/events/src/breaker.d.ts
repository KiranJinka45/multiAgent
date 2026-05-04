import { Redis } from 'ioredis';
/**
 * GLOBAL CIRCUIT BREAKER
 * Synchronizes failure state across all cluster nodes via Redis.
 * Prevents cascading failures by halting non-critical ingestion during outages.
 */
export declare class CircuitBreaker {
    private static readonly STATE_KEY;
    private static readonly REASON_KEY;
    private static readonly PROBE_COUNT;
    private static redis;
    static setRedis(redis: Redis): void;
    private static getRedis;
    /**
     * Checks if the circuit is currently allowing traffic.
     */
    static allowRequest(): Promise<boolean>;
    /**
     * Trips the circuit breaker to OPEN state.
     */
    static trip(reason: string, durationSeconds?: number): Promise<void>;
    /**
     * Success signal from a probe request.
     */
    static recordSuccess(): Promise<void>;
    /**
     * Manually resets the circuit breaker.
     */
    static reset(): Promise<void>;
    static getReason(): Promise<string | null>;
}
//# sourceMappingURL=breaker.d.ts.map
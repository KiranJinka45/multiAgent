/**
 * CHAOS ENGINE
 * Injects non-deterministic failures into the system to validate resilience.
 * Only active if specific environment variables are set and NODE_ENV is not production.
 */
export declare class ChaosEngine {
    private static isActive;
    static injectFailure(probability?: number): boolean;
    /**
     * Simulates a Redis connection timeout or command failure.
     */
    static maybeFailRedis(commandName: string): Promise<void>;
    /**
     * Simulates a worker process crash.
     */
    static maybeCrashWorker(): void;
    /**
     * Simulates a Database (Prisma) connectivity issue.
     */
    static maybeFailDB(): void;
}
//# sourceMappingURL=chaos.d.ts.map
/**
 * CONFIDENCE ENGINE
 * Computes a real-time health score (0-100) based on system metrics.
 */
export declare function calculateConfidence(metrics: {
    successRate: number;
    failureRate: number;
    retryRate: number;
    dlqRate: number;
    activeWorkers: number;
}): number;
//# sourceMappingURL=confidence-engine.d.ts.map
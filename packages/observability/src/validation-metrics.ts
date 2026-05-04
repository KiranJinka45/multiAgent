/**
 * METRICS COLLECTOR
 * Aggregates real-time health data from the Redis backbone for the Confidence Engine.
 */
export async function collectValidationMetrics(redis: any) {
    const [
        successCount,
        failedCount,
        retryCount,
        dlqSize,
        activeWorkers
    ] = await Promise.all([
        redis.get("metrics:job:success") || "0",
        redis.get("metrics:job:failed") || "0",
        redis.get("metrics:job:retries") || "0",
        redis.get("metrics:dlq:size") || "0",
        redis.get("metrics:workers:active") || "0"
    ]);

    const total = Number(successCount) + Number(failedCount);

    return {
        successRate: total === 0 ? 1 : Number(successCount) / total,
        failureRate: total === 0 ? 0 : Number(failedCount) / total,
        retryRate: Number(retryCount),
        dlqRate: Number(dlqSize),
        activeWorkers: Number(activeWorkers),
        timestamp: Date.now()
    };
}

import { Worker, Job } from 'bullmq';
import { logger } from '@packages/observability';
import { redis } from '@packages/shared-services';
import { SelfEvolver, SystemMetrics } from '@packages/self-evolution';

const QUEUE_EVOLUTION = 'self-evolution';
const evolver = new SelfEvolver({ autoRefactor: true });

export const evolutionWorker = new Worker(QUEUE_EVOLUTION, async (job: Job) => {
    logger.info({ jobId: job.id }, '[Evolution Worker] Starting system evolution cycle');
    
    try {
        // In a real system, we would fetch actual metrics from Prometheus/DB
        const mockMetrics = {
            cpuUsage: 80,
            memoryUsage: 90,
            errorRate: 5,
            latencyTarget: 200,
            actualLatency: 350
        };
        
        const mockLogs = [
            "WARN: High latency detected in API Gateway",
            "ERROR: Connection timeout to Redis"
        ];

        const result = await evolver.evolve(mockMetrics as unknown as SystemMetrics, mockLogs);
        
        logger.info({ result }, '[Evolution Worker] Evolution cycle completed');
        return result;
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error({ err }, '[Evolution Worker] Evolution cycle failed');
        throw new Error(`Evolution Error: ${errorMessage}`);
    }
}, {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - mismatch between local and BullMQ redis typings
    connection: redis,
    concurrency: 1
});

logger.info('Self-Evolution Worker online');

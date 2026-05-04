import { Router, Request, Response } from 'express';
import { Queue, redis } from '@packages/utils';
import { DEAD_LETTER_QUEUE_NAME, FailureClassifier } from '@packages/resilience';
import { logger } from '@packages/observability';

const router = Router();
const dlq = new Queue(DEAD_LETTER_QUEUE_NAME, { connection: redis });

/**
 * GET /api/admin/dlq
 * List failed jobs in the DLQ with failure classification.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const jobs = await dlq.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed']);
        res.json({
            count: jobs.length,
            jobs: jobs.map(job => {
                const error = job.data.error || job.failedReason || 'Unknown error';
                return {
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    failedReason: error,
                    classification: FailureClassifier.classify(error),
                    timestamp: job.timestamp,
                    failedAt: job.data.failedAt
                };
            })
        });
    } catch (err) {
        logger.error({ err }, '[AdminDLQ] Failed to fetch DLQ jobs');
        res.status(500).json({ error: 'Failed to fetch DLQ' });
    }
});

/**
 * POST /api/admin/dlq/replay/:jobId
 * Replay a specific job from the DLQ.
 */
router.post('/replay/:jobId', async (req: Request, res: Response) => {
    const { jobId } = req.params;

    try {
        const job = await dlq.getJob(jobId as string);
        if (!job) {
            return res.status(404).json({ error: 'Job not found in DLQ' });
        }

        const { originalQueue, data } = job.data;
        if (!originalQueue) {
            return res.status(400).json({ error: 'Job data missing originalQueue information' });
        }

        const targetQueue = new Queue(originalQueue, { connection: redis });
        
        // Add back to original queue with original data
        // We use a specific job name to indicate it's a manual replay
        await targetQueue.add(`manual-replay-${job.id}`, data, {
            attempts: 3, // Give it a few more tries
            backoff: { type: 'exponential', delay: 1000 }
        });

        // Remove from DLQ after successful replay
        await job.remove();

        logger.info({ jobId, originalQueue }, '[AdminDLQ] Job replayed successfully');
        res.json({ 
            message: 'Job replayed successfully', 
            targetQueue: originalQueue,
            replayId: `manual-replay-${job.id}`
        });
    } catch (err) {
        logger.error({ err, jobId }, '[AdminDLQ] Failed to replay job');
        res.status(500).json({ error: 'Failed to replay job' });
    }
});

/**
 * DELETE /api/admin/dlq/:jobId
 * Purge a job from the DLQ without replaying.
 */
router.delete('/:jobId', async (req: Request, res: Response) => {
    const { jobId } = req.params;

    try {
        const job = await dlq.getJob(jobId as string);
        if (!job) {
            return res.status(404).json({ error: 'Job not found in DLQ' });
        }

        await job.remove();
        res.json({ message: 'Job purged from DLQ' });
    } catch (err) {
        logger.error({ err, jobId }, '[AdminDLQ] Failed to purge job');
        res.status(500).json({ error: 'Failed to purge job' });
    }
});

/**
 * POST /api/admin/dlq/replay-all
 * Replay all jobs classified as TRANSIENT.
 */
router.post('/replay-all-transient', async (req: Request, res: Response) => {
    try {
        const jobs = await dlq.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed']);
        let replayedCount = 0;

        for (const job of jobs) {
            const error = job.data.error || job.failedReason || '';
            if (FailureClassifier.classify(error) === 'TRANSIENT') {
                const { originalQueue, data } = job.data;
                if (originalQueue) {
                    const targetQueue = new Queue(originalQueue, { connection: redis });
                    await targetQueue.add(`auto-replay-${job.id}`, data);
                    await job.remove();
                    replayedCount++;
                }
            }
        }

        res.json({ message: `Successfully replayed ${replayedCount} transient jobs` });
    } catch (err) {
        logger.error({ err }, '[AdminDLQ] Bulk replay failed');
        res.status(500).json({ error: 'Bulk replay failed' });
    }
});

export default router;

import { Request, Response } from 'express';
import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

/**
 * Controller to monitor the status and concurrency of the worker fleet.
 */
export const getWorkerStatus = async (req: Request, res: Response) => {
  try {
    // Collect all active worker heartbeats
    const workerKeys = await redis.keys('worker:heartbeat:*');
    const workers = await Promise.all(workerKeys.map(async (key) => {
      const data = await redis.get(key);
      const name = key.split(':').pop();
      return {
        id: name,
        ...(data ? JSON.parse(data) : { status: 'unknown' }),
        lastSeen: await redis.ttl(key) // Remaining TTL as a freshness indicator
      };
    }));

    res.json({
      activeCount: workers.length,
      fleet: workers,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error({ error }, '[WorkerController] Failed to fetch worker status');
    res.status(500).json({ status: 'error', message: 'Failed to fetch worker status' });
  }
};

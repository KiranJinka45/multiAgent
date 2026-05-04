import { Request, Response } from 'express';
import { eventBus } from '@packages/utils';
import { logger } from '@packages/observability';

/**
 * Controller to fetch the chronological timeline of events for a specific build.
 * Useful for the "Live Timeline" and "Agent Progress" views in the dashboard.
 */
export const getBuildTimeline = async (req: Request, res: Response) => {
  const { executionId } = req.params;

  if (!executionId) {
    return res.status(400).json({ error: 'Missing executionId' });
  }

  try {
    logger.info({ executionId }, '[API] Fetching build timeline');

    // 1. Try fetching from the Persistent Database (SSOT for history)
    const { db } = await import('@packages/db');
    const dbLogs = await db.executionLog.findMany({
        where: { executionId },
        orderBy: { createdAt: 'asc' }
    });

    if (dbLogs.length > 0) {
        // Map DB logs to the format expected by the frontend
        const timeline = dbLogs.map(log => ({
            ...(log.metadata as any || {}),
            stage: log.stage,
            status: log.status,
            message: log.message,
            totalProgress: log.progress,
            _sequence: log.eventId,
            timestamp: log.createdAt.toISOString()
        }));
        return res.json(timeline);
    }

    // 2. Fallback to Redis Stream if DB is empty (mission just started)
    const eventsWithIds = await eventBus.readBuildEvents(executionId, '0');

    // Map to just the event objects
    const timeline = eventsWithIds.map(([, event]) => event);

    res.json(timeline);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg, executionId }, '[API] Failed to fetch build timeline');
    res.status(500).json({ error: 'Internal server error' });
  }
};


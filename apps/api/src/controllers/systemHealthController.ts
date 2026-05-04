import { Request, Response } from 'express';
import { db } from '@packages/db';
import { redis, stateManager } from '@packages/utils';
import { ReliabilityMonitor } from '../services/reliability-monitor';
import { logger } from '@packages/observability';
import { Connection, Client } from '@temporalio/client';

/**
 * Controller to aggregate the health status of all core infrastructure components.
 * Essential for the SaaS DevOps dashboard.
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    // 1. Check Database Health
    let dbStatus = 'down';
    try {
      await db.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch (err) {
      logger.error({ err }, '[Health] DB check failed');
    }

    // 2. Check Redis Health
    const redisStatus = redis.status === 'ready' ? 'up' : 'down';

    // 3. Worker Fleet Metrics
    const activeWorkers = await redis.keys('worker:heartbeat:*').then(keys => keys.length);
    
    // 4. SRE Control Plane Logic
    const mode = (await redis.get('sre:control_plane:mode')) || 'NORMAL';
    const confidenceStr = await redis.get('sre:control_plane:confidence');
    const confidence = confidenceStr ? parseInt(confidenceStr, 10) : 100;
    
    const errorRateStr = await redis.get('sre:metrics:error_rate');
    const errorRate = errorRateStr ? parseFloat(errorRateStr) : 0;

    const avgLatencyStr = await redis.get('sre:metrics:avg_latency');
    const avgLatency = avgLatencyStr ? parseFloat(avgLatencyStr) : 240;

    // 5. Event Backbone Metrics
    let eventMetrics: any = { streamLength: 0, pelSize: 0, dlqSize: 0, latencyMs: 0 };
    try {
        const { eventBus } = await import('@packages/events');
        eventMetrics = await (eventBus as any).getStreamMetrics('platform:mission:events') || eventMetrics;
    } catch (err) {
        logger.error({ err }, '[Health] Event metrics failed');
    }

    // 6. Active Incident Detection
    let activeIncident: any = null;
    if (mode !== 'NORMAL') {
        const incidentData = await redis.get('sre:incident:active');
        if (incidentData) {
            activeIncident = JSON.parse(incidentData);
        } else {
            activeIncident = {
                id: 'AUTO-' + Date.now().toString(36),
                startTime: Date.now() - 300000, // Mock 5 mins ago if missing
                severity: mode === 'EMERGENCY' ? 'CRITICAL' : 'HIGH',
                cause: 'Automated Shielding triggered by high error rates',
                metrics: { errorRate, latency: avgLatency }
            };
        }
    }

    const health = {
      status: (dbStatus === 'up' && redisStatus === 'up') ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      data: {
        activeWorkers,
        totalWorkers: Math.max(activeWorkers, 10), // Expected fleet size
        queueDepth: await redis.llen('bull:build-queue:wait'),
        avgLatency,
        errorRate,
        confidence,
        mode,
        events: eventMetrics,
        activeIncident,
        infrastructure: {
            database: { status: dbStatus },
            redis: { status: redisStatus },
            reliability: await ReliabilityMonitor.getStats()
        }
      }
    };

    res.json(health);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, '[API] System health check crashed');
    res.status(500).json({ status: 'error', message: msg });
  }
};



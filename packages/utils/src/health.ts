import type { Request, Response } from 'express';
import { Router } from 'express';
import { db } from '@packages/db';
import { logger } from '@packages/observability';

class DatabaseHealthMonitor {
  private cachedStatus: { confidence: number; lastCheck: number; rttMs: number } = {
    confidence: 100, lastCheck: 0, rttMs: 0
  };
  private checkPromise: Promise<{ healthy: boolean; confidence: number }> | null = null;
  private readonly stalenessMs = 2000;

  async isHealthy(): Promise<{ healthy: boolean; confidence: number; rttMs: number }> {
    const now = Date.now();
    if (now - this.cachedStatus.lastCheck < this.stalenessMs) {
      return { healthy: this.cachedStatus.confidence >= 80, confidence: this.cachedStatus.confidence, rttMs: this.cachedStatus.rttMs };
    }

    if (!this.checkPromise) {
      this.checkPromise = this.performCheck();
    }

    const result = await this.checkPromise;
    this.checkPromise = null;
    return { healthy: result.healthy, confidence: result.confidence, rttMs: this.cachedStatus.rttMs };
  }

  private async performCheck(): Promise<{ healthy: boolean; confidence: number }> {
    const start = Date.now();
    try {
      await db.$queryRaw`SELECT 1`;
      const newConfidence = Math.min(100, this.cachedStatus.confidence + 10);
      this.cachedStatus = { confidence: newConfidence, lastCheck: Date.now(), rttMs: Date.now() - start };
      return { healthy: newConfidence >= 80, confidence: newConfidence };
    } catch {
      const newConfidence = Math.max(0, this.cachedStatus.confidence - 30);
      this.cachedStatus = { confidence: newConfidence, lastCheck: Date.now(), rttMs: Date.now() - start };
      return { healthy: newConfidence >= 80, confidence: newConfidence };
    }
  }
}

export const dbHealthMonitor = new DatabaseHealthMonitor();

/**
 * Standardized Health Check Router
 * Provides both minimal (/health) and detailed (/health/details) endpoints.
 */
export function createHealthRouter(options: { 
  serviceName: string;
  checkDependencies?: () => Promise<Record<string, { status: string; message?: string }>>;
}): Router {
  const router = Router();

  // 1. Liveness Probe (Minimal) - Used by Kubernetes
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Readiness Probe - Used by Kubernetes
  router.get('/health/ready', async (_req: Request, res: Response) => {
    try {
      const { healthy } = await dbHealthMonitor.isHealthy();
      if (!healthy) {
         throw new Error('Database substrate check failed');
      }
      
      if (options.checkDependencies) {
        const deps = await options.checkDependencies().catch(err => {
          logger.error({ err }, `[Health][${options.serviceName}] Dependency check failed inside readiness`);
          return { custom: { status: 'down', message: String(err) } };
        });
        
        const anyDown = Object.values(deps).some(d => d.status === 'down');
        if (anyDown) {
          logger.warn({ deps }, `[Health][${options.serviceName}] Readiness check degraded due to dependencies`);
          res.status(503).json({ 
            status: 'unready', 
            error: 'Dependencies degraded',
            details: deps 
          });
          return;
        }
      }
      
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error({ err }, `[Health][${options.serviceName}] Readiness check failed`);
      res.status(503).json({ status: 'unready', error: 'Database or dependencies unavailable' });
    }
  });

  // 3. Detailed Health - Used for monitoring
  router.get('/health/details', async (_req: Request, res: Response) => {
    let dbStatus = 'up';
    try {
      const { healthy } = await dbHealthMonitor.isHealthy();
      if (!healthy) {
        dbStatus = 'down';
        logger.error(`[Health][${options.serviceName}] DB check failed`);
      }
    } catch (err) {
      dbStatus = 'down';
      logger.error({ err }, `[Health][${options.serviceName}] DB check failed`);
    }

    const dependencies = options.checkDependencies 
      ? await options.checkDependencies().catch(err => {
          logger.error({ err }, `[Health][${options.serviceName}] Custom dependency check failed`);
          return { error: { status: 'down', message: String(err) } };
        })
      : {};

    const isHealthy = dbStatus === 'up' && Object.values(dependencies).every(d => d.status === 'up');

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: options.serviceName,
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: dbStatus },
        ...dependencies
      }
    });
  });

  return router;
}
// Removed local CircuitBreaker class as it is now imported from @packages/events

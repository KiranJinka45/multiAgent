import { Request, Response, Router } from 'express';
import { db } from '@packages/db';
import { logger } from '@packages/observability';

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
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error({ err }, `[Health][${options.serviceName}] Readiness check failed`);
      res.status(503).json({ status: 'unready', error: 'Database unavailable' });
    }
  });

  // 3. Detailed Health - Used for monitoring
  router.get('/health/details', async (_req: Request, res: Response) => {
    let dbStatus = 'up';
    try {
      await db.$queryRaw`SELECT 1`;
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

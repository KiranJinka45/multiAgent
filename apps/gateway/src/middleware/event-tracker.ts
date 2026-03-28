import { Request, Response, NextFunction } from 'express';
import { db } from '@packages/db';

export async function eventTracker(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      // Capture authenticated user if available
      const authReq = req as Request & { user?: { id: string; tenantId: string } };
      const userId = authReq.user?.id || null;
      const tenantId = authReq.user?.tenantId || null;

      await db.event.create({
        data: {
          type: 'api_call',
          userId,
          tenantId,
          metadata: {
            path: req.path,
            method: req.method,
            status: res.statusCode,
            duration: Date.now() - start,
            ip: req.ip,
            userAgent: req.get('user-agent'),
          },
        },
      });
    } catch (error) {
      // Silent fail to avoid breaking requests if logging fails
      console.error('[EventTracker] Failed to log event:', error);
    }
  });

  next();
}

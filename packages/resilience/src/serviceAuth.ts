import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@packages/observability';

const SERVICE_SECRET = process.env.SERVICE_SECRET || 'multiagent-internal-secret-change-me-in-prod';

/**
 * Sign a short-lived token for service-to-service communication
 */
export function signServiceToken(serviceName: string): string {
  return jwt.sign(
    { svc: serviceName },
    SERVICE_SECRET,
    { expiresIn: '5m' }
  );
}

/**
 * Middleware to verify service-to-service identity
 */
export function serviceAuth(allowedServices: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn({ path: req.path }, '[ZeroTrust] Missing service token');
      return res.sendStatus(401);
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SERVICE_SECRET);
      
      if (typeof decoded === 'string' || !decoded.svc) {
        logger.error({ token }, '[ZeroTrust] Malformed service token payload');
        return res.sendStatus(403);
      }
      
      if (!allowedServices.includes(decoded.svc)) {
        logger.error(
          { caller: decoded.svc, allowed: allowedServices }, 
          '[ZeroTrust] Unauthorized service caller'
        );
        return res.sendStatus(403);
      }

      // Attach caller info for traceability
      (req as Request & { serviceCaller: string }).serviceCaller = (decoded as any).svc;
      return next();
    } catch (err) {
      logger.error({ err }, '[ZeroTrust] Invalid service token');
      return res.status(403).json({ error: 'Invalid service token' });
    }
  };
}


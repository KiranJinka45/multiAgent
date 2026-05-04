import { Request, Response, NextFunction } from 'express';
import { logger } from '@packages/observability';

/**
 * Middleware to enforce Internal API Key validation.
 * Used to secure service-to-service communication within the cluster.
 */
export const internalAuth = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-internal-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
        logger.warn('[AuthZ] INTERNAL_API_KEY is not configured on this service. Rejecting request.');
        return res.status(500).json({ error: 'Internal configuration error' });
    }

    if (!apiKey || apiKey !== expectedKey) {
        logger.warn({ ip: req.ip, path: req.path }, '[AuthZ] Rejected internal request: Invalid or missing API key');
        return res.status(403).json({ error: 'Forbidden: Invalid internal API key' });
    }

    next();
};

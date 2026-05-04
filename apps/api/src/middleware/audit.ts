import { Request, Response, NextFunction } from 'express';
import { db } from '@packages/db';
import { logger } from '@packages/observability';

/**
 * PRODUCTION-GRADE AUDIT LOGGING MIDDLEWARE
 * Automatically records sensitive operational actions to the database AuditLog.
 * Captures user identity, tenant context, action, and outcome.
 */
export const auditAction = (actionName: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        const startTime = Date.now();

        // Wrap res.send to capture response status/payload for audit
        res.send = function (body: any) {
            const duration = Date.now() - startTime;
            const status = res.statusCode >= 400 ? 'ERROR' : 'SUCCESS';

            // Async background logging to avoid blocking response
            db.auditLog.create({
                data: {
                    tenantId: req.user?.tenantId || 'system',
                    userId: req.user?.id,
                    action: actionName,
                    resource: req.originalUrl,
                    status,
                    ipAddress: req.ip,
                    metadata: {
                        method: req.method,
                        durationMs: duration,
                        statusCode: res.statusCode,
                        params: req.params,
                        query: req.query,
                        // Avoid logging sensitive body data
                        hasBody: !!req.body
                    }
                }
            }).catch(err => {
                logger.error({ err, action: actionName }, '[Audit] Failed to persist audit log');
            });

            return originalSend.call(this, body);
        };

        next();
    };
};

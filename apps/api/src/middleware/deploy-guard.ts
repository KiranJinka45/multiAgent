import { Request, Response, NextFunction } from 'express';
import { getLiveCertification } from '@packages/utils';
import { logger } from '@packages/observability';

/**
 * DEPLOYMENT GUARD MIDDLEWARE
 * Blocks deployment-related requests if the system confidence is below the Tier-1 threshold (90%).
 */
export async function deployGuard(req: Request, res: Response, next: NextFunction) {
    const cert = await getLiveCertification();

    if (!cert) {
        logger.warn('[DeployGuard] Blocked: No live certification data found.');
        return res.status(503).json({
            error: 'DEPLOY_BLOCKED',
            message: 'No live certification data available. System safety cannot be verified.'
        });
    }

    if (cert.status !== 'CERTIFIED' || cert.confidence < 90) {
        logger.error({ 
            status: cert.status, 
            confidence: cert.confidence 
        }, '[DeployGuard] Blocked: System stability below threshold');

        return res.status(503).json({
            error: 'DEPLOY_BLOCKED',
            message: `System confidence (${cert.confidence}%) is below the Tier-1 threshold (90%). Deployment suspended for safety.`,
            reasons: cert.metrics.failureRate > 0.01 ? ['High Error Rate'] : ['Resource Instability']
        });
    }

    logger.info({ confidence: cert.confidence }, '[DeployGuard] Allowed: System is stable.');
    next();
}

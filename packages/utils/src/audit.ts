import { db } from '@packages/db';
import { logger } from '@packages/observability';
import crypto from 'crypto';

export interface AuditEvent {
  action: string;
  resource: string;
  userId?: string;
  tenantId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'ERROR';
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * PRODUCTION AUDIT AUTHORITY
 * Standardized logging for critical security events and business mutations.
 */
export const AuditLogger = {
  /**
   * Log a security or mutation event to the DB and JSON logs.
   * Implements Chained Hashing for Tamper Evidence.
   */
  async log(event: AuditEvent) {
    const timestamp = new Date();
    
    try {
      // 1. Fetch the hash of the PREVIOUS entry for this tenant to create a chain
      const lastEntry = await db.auditLog.findFirst({
        where: { tenantId: event.tenantId || 'platform-admin' },
        orderBy: { createdAt: 'desc' },
        select: { hash: true }
      });

      const prevHash = lastEntry?.hash || '0'.repeat(64); // Genesis hash if first entry

      const refinedMetadata = {
        ...event.metadata,
        timestamp: timestamp.toISOString(),
        service: process.env.SERVICE_NAME || 'unknown',
        prevHash
      };

      // 2. Generate an integrity hash (Tamper Detection)
      // Chaining: hash = sha256(action | resource | userId | timestamp | prevHash)
      const hashData = `${event.action}|${event.resource}|${event.userId || 'system'}|${timestamp.getTime()}|${prevHash}`;
      const hash = crypto.createHash('sha256').update(hashData).digest('hex');

      // 3. Write to Database
      await db.auditLog.create({
        data: {
          action: event.action,
          resource: event.resource,
          userId: event.userId,
          tenantId: event.tenantId || 'platform-admin',
          status: event.status as any,
          metadata: refinedMetadata,
          ipAddress: event.ipAddress,
          hash,
        },
      });

      // 4. Emit Structured JSON Log
      logger.info({
        audit: true,
        hash,
        prevHash,
        ...event,
        metadata: refinedMetadata,
      }, `[AUDIT] ${event.action} - ${event.status}`);

    } catch (err) {
      logger.error({ err, event }, '[AuditLogger] CRITICAL: Failed to write audit log');
    }
  },

  /**
   * Verifies the cryptographic chain for a specific tenant.
   * Returns { valid: boolean, brokenAtId?: string }
   */
  async verifyChain(tenantId: string) {
    try {
      const logs = await db.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
      });

      let expectedPrevHash = '0'.repeat(64);

      for (const log of logs) {
        const metadata = log.metadata as any;
        
        // Recompute hash
        const timestamp = new Date(log.createdAt).getTime();
        const hashData = `${log.action}|${log.resource}|${log.userId || 'system'}|${timestamp}|${expectedPrevHash}`;
        const actualHash = crypto.createHash('sha256').update(hashData).digest('hex');

        if (actualHash !== log.hash || metadata.prevHash !== expectedPrevHash) {
          logger.error({ logId: log.id, tenantId }, '[AuditLogger] LEDGER TAMPERED: Hash mismatch detected');
          return { valid: false, brokenAtId: log.id };
        }

        expectedPrevHash = log.hash;
      }

      return { valid: true };
    } catch (err) {
      logger.error({ err, tenantId }, '[AuditLogger] Verification failed');
      return { valid: false };
    }
  },

  /**
   * Specialized security events
   */
  async logSecurity(action: string, status: 'SUCCESS' | 'FAILURE', metadata?: any) {
    await this.log({
      action,
      resource: 'auth-layer',
      status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
      metadata,
    });
  },

  /**
   * Specialized business mutation events
   */
  async logAction(action: string, status: 'SUCCESS' | 'FAILURE', metadata?: any) {
    await this.log({
      action,
      resource: 'business-logic',
      status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
      metadata,
    });
  }
};

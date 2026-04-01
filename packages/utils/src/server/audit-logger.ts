import { db as prisma } from '@packages/db';
import logger from '@packages/observability';
import crypto from 'crypto';

export interface AuditEvent {
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditLogger {
  private static INITIAL_HASH = '0'.repeat(64); // Seed hash for the first log

  /**
   * Generates a SHA-256 hash for the current event, chained to the previous hash.
   */
  private static calculateHash(event: AuditEvent, prevHash: string): string {
    const data = JSON.stringify({
      organizationId: event.organizationId,
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      metadata: event.metadata,
      prevHash
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Records a tamper-proof audit event.
   */
  public static async log(event: AuditEvent): Promise<void> {
    try {
      // 1. Get the latest log's hash to chain
      const latestLog = await prisma.auditLog.findFirst({
        where: { tenantId: event.organizationId },
        orderBy: { createdAt: 'desc' },
        select: { hash: true }
      });

      const prevHash = latestLog ? latestLog.hash : this.INITIAL_HASH;

      // 2. Calculate new hash
      const hash = this.calculateHash(event, prevHash);

      // 3. Persist
      await prisma.auditLog.create({
        data: {
          tenantId: event.organizationId,
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          metadata: (event.metadata || {}) as any,
          ipAddress: event.ipAddress || null,
          hash
        }
      });

      logger.info({ action: event.action, organizationId: event.organizationId }, '[AuditLogger] Recorded secure audit event');
    } catch (err: unknown) {
      logger.error({ err }, '[AuditLogger] Failed to record audit event');
    }
  }

  /**
   * Verifies the integrity of the audit chain for a tenant.
   * Returns true if the chain is intact, false otherwise.
   */
  public static async verifyChain(organizationId: string): Promise<boolean> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId: organizationId },
        orderBy: { createdAt: 'asc' }
      });

      let currentPrevHash = this.INITIAL_HASH;

      for (const log of logs) {
        const expectedHash = this.calculateHash({
          organizationId: log.tenantId,
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          metadata: (log.metadata || {}) as any
        }, currentPrevHash);

        if (log.hash !== expectedHash) {
          logger.error({ logId: log.id }, '[AuditLogger] Tamper detected in audit chain!');
          return false;
        }
        currentPrevHash = log.hash;
      }

      return true;
    } catch (err: unknown) {
      logger.error({ err }, '[AuditLogger] Failed to verify audit chain');
      return false;
    }
  }

  /**
   * Retrieves the most recent log entry for a tenant.
   */
  public static async getLatestLog(organizationId: string): Promise<Record<string, unknown> | null> {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: organizationId },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    return (logs[0] as unknown as Record<string, unknown>) || null;
  }
}

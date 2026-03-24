import { prisma } from '@libs/db';
import logger from '../config/logger';
import crypto from 'crypto';

export interface AuditEvent {
  tenantId: string;
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
      tenantId: event.tenantId,
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
        where: { tenantId: event.tenantId },
        orderBy: { createdAt: 'desc' },
        select: { hash: true }
      });

      const prevHash = latestLog ? latestLog.hash : this.INITIAL_HASH;

      // 2. Calculate new hash
      const hash = this.calculateHash(event, prevHash);

      // 3. Persist
      await prisma.auditLog.create({
        data: {
          tenantId: event.tenantId,
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          metadata: event.metadata as Record<string, unknown>,
          ipAddress: event.ipAddress,
          hash
        }
      });

      logger.info({ action: event.action, tenantId: event.tenantId }, '[AuditLogger] Recorded secure audit event');
    } catch (err: unknown) {
      logger.error({ err }, '[AuditLogger] Failed to record audit event');
    }
  }

  /**
   * Verifies the integrity of the audit chain for a tenant.
   * Returns true if the chain is intact, false otherwise.
   */
  public static async verifyChain(tenantId: string): Promise<boolean> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
      });

      let currentPrevHash = this.INITIAL_HASH;

      for (const log of logs) {
        const expectedHash = this.calculateHash({
          tenantId: log.tenantId,
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          metadata: log.metadata as Record<string, unknown>
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
  public static async getLatestLog(tenantId: string): Promise<Record<string, unknown> | null> {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    return (logs[0] as unknown as Record<string, unknown>) || null;
  }
}

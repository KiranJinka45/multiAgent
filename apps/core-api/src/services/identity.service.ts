import { logger } from '@packages/observability';
import { db } from '@packages/db';

interface NodeIdentity {
  nodeId: string;
  publicKey: string; // 48 bytes compressed G1 hex
  status: 'ACTIVE' | 'REVOKED';
  updatedAt: Date;
}

/**
 * IdentityService (Hardened - Persistent)
 * 
 * Manages the node registry and cryptographic identity lifecycle.
 * Now backed by Prisma/Postgres for production durability.
 */
export class IdentityService {
  /**
   * Get public key for a node from the database.
   */
  public static async getPublicKey(nodeId: string): Promise<string | null> {
    try {
      const identity = await db.ztanIdentity.findUnique({
        where: { nodeId }
      });
      
      if (!identity || identity.status !== 'ACTIVE') return null;
      return identity.publicKey;
    } catch (err: any) {
      logger.error({ nodeId, err: err.message }, '[IDENTITY] Database lookup failed');
      return null;
    }
  }

  /**
   * Revoke an identity (Critical for audit compliance).
   * Prevents node from participating in any future ceremonies.
   */
  public static async revoke(nodeId: string): Promise<void> {
    try {
      await db.ztanIdentity.update({
        where: { nodeId },
        data: { 
          status: 'REVOKED'
        }
      });
      logger.warn({ nodeId }, '[IDENTITY] Node identity REVOKED in persistent store');
    } catch (err: any) {
      logger.error({ nodeId, err: err.message }, '[IDENTITY] Revocation failed');
    }
  }

  /**
   * Rotate a node's public key.
   */
  public static async rotateKey(nodeId: string, newPublicKey: string): Promise<void> {
    try {
      await db.ztanIdentity.update({
        where: { nodeId },
        data: { 
          publicKey: newPublicKey,
          status: 'ACTIVE'
        }
      });
      logger.info({ nodeId }, '[IDENTITY] Node public key rotated in persistent store');
    } catch (err: any) {
      logger.error({ nodeId, err: err.message }, '[IDENTITY] Key rotation failed');
    }
  }

  public static async isRegistered(nodeId: string): Promise<boolean> {
    try {
      const id = await db.ztanIdentity.findUnique({
        where: { nodeId }
      });
      return id !== null && id.status === 'ACTIVE';
    } catch (err: any) {
      logger.error({ nodeId, err: err.message }, '[IDENTITY] Registration check failed');
      return false;
    }
  }

  /**
   * Seed default identities if they don't exist (Transition aid).
   * Called during application bootstrap.
   */
  public static async bootstrap(): Promise<void> {
    const defaults = [
      { nodeId: 'nodeA', publicKey: 'b14972e3917822b3780a4a6e7275727931322d333831204731204b657920412e2e2e' },
      { nodeId: 'nodeB', publicKey: 'b14972e3917822b3780a4a6e7275727931322d333831204731204b657920422e2e2e' },
      { nodeId: 'nodeC', publicKey: 'b14972e3917822b3780a4a6e7275727931322d333831204731204b657920432e2e2e' },
      { nodeId: 'CFO-01', publicKey: 'b14972e3917822b3780a4a6e7275727931322d333831204731204b65792043464f' },
      { nodeId: 'COMPLIANCE-02', publicKey: 'b14972e3917822b3780a4a6e7275727931322d333831204731204b657920434d50' },
      { nodeId: 'CEO-03', publicKey: 'b14972e3917822b3780a4a6e7275727931322d333831204731204b65792043454f' },
    ];

    try {
      for (const d of defaults) {
        await db.ztanIdentity.upsert({
          where: { nodeId: d.nodeId },
          update: {},
          create: {
            nodeId: d.nodeId,
            publicKey: d.publicKey,
            status: 'ACTIVE'
          }
        });
      }
      logger.info('[IDENTITY] Registry bootstrapped with default nodes');
    } catch (err: any) {
      logger.error({ err: err.message }, '[IDENTITY] Bootstrap seeding failed');
    }
  }
}

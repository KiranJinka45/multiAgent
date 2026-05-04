import { logger } from '@packages/observability';
import { ProofBundle } from '@packages/ztan-crypto';
import { redis } from '../services/redis'; // Assuming redis is available

const ARCHIVE_KEY = 'ztan:archive:proofs';

/**
 * ProofArchiveService
 * 
 * Handles long-term persistence and immutability of audit evidence.
 * Simulates an append-only log with retention policy enforcement.
 */
export class ProofArchiveService {
  /**
   * Archives a proof bundle.
   * In production, this would write to S3 with Object Lock or a dedicated audit DB.
   */
  public static async archive(bundle: ProofBundle): Promise<string> {
    const archiveId = `ZTAN-PROOF-${bundle.ceremonyId}-${Date.now()}`;
    
    // Phase 5: Enforce immutability (Simulated by preventing overwrite)
    const exists = await redis.exists(`${ARCHIVE_KEY}:${archiveId}`);
    if (exists) {
        throw new Error('[SECURITY] REJECT: Cannot overwrite existing audit proof. Immutability violation.');
    }

    // Persist with 1-year retention (simulated)
    await redis.set(`${ARCHIVE_KEY}:${archiveId}`, JSON.stringify(bundle));
    
    logger.info({ archiveId, ceremonyId: bundle.ceremonyId }, '[ARCHIVE] Proof bundle successfully committed to long-term storage');
    return archiveId;
  }

  /**
   * Retrieves a proof bundle from the archive.
   */
  public static async get(archiveId: string): Promise<ProofBundle | null> {
    const data = await redis.get(`${ARCHIVE_KEY}:${archiveId}`);
    return data ? JSON.parse(data) : null;
  }
}

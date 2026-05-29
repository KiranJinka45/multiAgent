import * as crypto from 'crypto';

export interface RekorEntry {
  logIndex: number;
  payloadHash: string;
  inclusionProof: string; // Simulated Merkle proof
}

/**
 * MockRekorLedger
 * 
 * Simulates a Sigstore Rekor transparency log.
 * Every valid state transition must be anchored here for non-repudiation.
 */
export class MockRekorLedger {
  private log: RekorEntry[] = [];

  /**
   * Publishes a confirmed state hash to the transparency log.
   */
  public publishEntry(payloadHash: string, signature: string): RekorEntry {
    const logIndex = this.log.length;
    
    // Simulate generating a Merkle inclusion proof
    const proofPreimage = `${logIndex}::${payloadHash}::${signature}::REKOR_ROOT`;
    const inclusionProof = crypto.createHash('sha256').update(proofPreimage).digest('hex');

    const entry: RekorEntry = {
      logIndex,
      payloadHash,
      inclusionProof
    };

    this.log.push(entry);
    console.log(`[Rekor] 📜 Appended payload ${payloadHash.slice(0, 8)}... at log index ${logIndex}`);
    
    return entry;
  }

  public getLogSize(): number {
    return this.log.length;
  }
}

export const rekor = new MockRekorLedger();

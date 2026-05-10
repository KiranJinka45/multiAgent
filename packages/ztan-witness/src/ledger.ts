import * as crypto from 'crypto';
import { logger } from '../../observability/src';

/** 🛡️ Institutional Epoch: The atomic unit of synchronization */
export interface RootEpoch {
  readonly epochId: number;
  readonly rootHash: string;
  readonly prevRootHash: string | null;
  readonly envelopeRange: {
    readonly start: number;
    readonly end: number;
  };
  readonly timestamp: string;
  readonly signature: string; // Witness signature of the epoch summary
}

/**
 * 🛡️ RootLedger
 * Append-only immutable ledger for tracking institutional epochs.
 * This provides the historical lineage of truth.
 */
export class RootLedger {
  private epochs: RootEpoch[] = [];

  constructor(private readonly witnessPrivateKey: crypto.KeyObject) {}

  /**
   * Commits a new epoch to the ledger.
   * Enforces monotonicity and cryptographic linkage.
   */
  public commit(
    rootHash: string,
    envelopeRange: { start: number; end: number }
  ): RootEpoch {
    const prevEpoch = this.epochs[this.epochs.length - 1] || null;
    const epochId = (prevEpoch?.epochId || 0) + 1;
    const prevRootHash = prevEpoch?.rootHash || null;

    const epochSummary = {
      epochId,
      rootHash,
      prevRootHash,
      envelopeRange,
      timestamp: new Date().toISOString(),
    };

    // Sign the epoch summary to ensure institutional non-repudiation
    const signature = crypto.sign("sha256", Buffer.from(JSON.stringify(epochSummary)), {
      key: this.witnessPrivateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    }).toString('base64');

    const epoch: RootEpoch = {
      ...epochSummary,
      signature,
    };

    // Immutability Check: Ensure we never overwrite or fork locally
    this.epochs.push(Object.freeze(epoch));
    
    logger.info({ 
      epochId: epoch.epochId, 
      rootHash: epoch.rootHash 
    }, '[RootLedger] Epoch committed to institutional lineage');

    return epoch;
  }

  public getLatestEpoch(): RootEpoch | null {
    return this.epochs[this.epochs.length - 1] || null;
  }

  public getHistory(): ReadonlyArray<RootEpoch> {
    return Object.freeze([...this.epochs]);
  }

  /**
   * Validates the entire ledger lineage for consistency.
   */
  public validateLineage(): boolean {
    for (let i = 1; i < this.epochs.length; i++) {
      const prev = this.epochs[i - 1];
      const current = this.epochs[i];
      
      if (current.prevRootHash !== prev.rootHash) return false;
      if (current.epochId !== prev.epochId + 1) return false;
      if (current.envelopeRange.start <= prev.envelopeRange.end) return false;
    }
    return true;
  }
}

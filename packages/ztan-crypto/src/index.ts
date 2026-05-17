import { ThresholdBls } from '@packages/utils';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface AuditInput {
  auditId: string;
  payloadHash: string;
  timestamp: number;
  partialAnchorSignatures?: { verifierId: string; signature: string }[];
  consensusThreshold?: number;
}

export interface VerificationResult {
  status: 'VERIFIED' | 'FAILED';
  errorType?: 'REPLAY_DETECTED' | 'INVALID_SIGNATURE' | 'THRESHOLD_NOT_MET';
  finalAnchor?: string;
  aggregateAnchorSignature?: string;
  contributingVerifiers?: string[];
}

export class FileReplayGuard {
  private dbPath: string;
  private seenHashes: Set<string> = new Set();

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.load();
  }

  private load() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        this.seenHashes = new Set(data);
      } catch (e) {
        console.error('[REPLAY-GUARD] Failed to load replay DB:', e);
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(Array.from(this.seenHashes)), 'utf8');
    } catch (e) {
      console.error('[REPLAY-GUARD] Failed to save replay DB:', e);
    }
  }

  public isSeen(hash: string): boolean {
    return this.seenHashes.has(hash);
  }

  public markSeen(hash: string) {
    this.seenHashes.add(hash);
    this.save();
  }
}

export class ThresholdCrypto {
  /**
   * Verifies an audit input, checking for replays and threshold consensus.
   */
  public static async verifyAudit(
    payload: string, 
    options: { guard: FileReplayGuard; skipMarkSeen?: boolean }
  ): Promise<VerificationResult> {
    const input: AuditInput = JSON.parse(payload);
    const anchor = crypto.createHash('sha256').update(input.payloadHash + input.timestamp).digest('hex');

    // 1. Replay Protection
    if (options.guard.isSeen(anchor)) {
      return { status: 'FAILED', errorType: 'REPLAY_DETECTED', finalAnchor: anchor };
    }

    if (!options.skipMarkSeen) {
      options.guard.markSeen(anchor);
    }

    // 2. Threshold Consensus Check
    if (input.partialAnchorSignatures && input.consensusThreshold) {
      if (input.partialAnchorSignatures.length < input.consensusThreshold) {
        return { status: 'FAILED', errorType: 'THRESHOLD_NOT_MET', finalAnchor: anchor };
      }

      // In a real system, we would aggregate the BLS signatures here.
      // Mocking aggregation for the drill.
      const aggregateSig = `agg:${input.partialAnchorSignatures.length}:${anchor.substring(0, 16)}`;
      
      return {
        status: 'VERIFIED',
        finalAnchor: anchor,
        aggregateAnchorSignature: aggregateSig,
        contributingVerifiers: input.partialAnchorSignatures.map(p => p.verifierId)
      };
    }

    // Initial verification (pre-consensus)
    return {
      status: 'VERIFIED',
      finalAnchor: anchor
    };
  }

  /**
   * Signs an anchor with a simulated threshold share.
   */
  public static async signAnchor(anchor: string, signerId: string): Promise<string> {
    // Mock partial signature
    return `part-sig:${signerId}:${anchor.substring(0, 8)}`;
  }
}
